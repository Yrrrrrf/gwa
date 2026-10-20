import { assert, equal } from "../../helpers/assert.ts";
const runtime = new URL("../../../scripts/runtime.ts", import.meta.url).pathname;
const decode = new TextDecoder();

async function fixture(extra: Record<string, string> = {}) {
  await Deno.mkdir(".state", { recursive: true });
  const dir = await Deno.makeTempDir({
    dir: ".state",
    prefix: "session-test-",
  });
  await Deno.mkdir(`${dir}/bin`);
  const common = `const dir = Deno.env.get('FIXTURE'); const args = Deno.args;\n`;
  const commands = {
    just: common + `
      await Deno.writeTextFile(dir+'/calls', JSON.stringify(args)+'\\n', {append:true});
      if(args[0]==='_project') console.log('gwa-test-session');
      if(args[0]==='_state') console.log(JSON.stringify({env:{GWA_DB_URL:'http://db',GWA_HTTP_URL:'http://engine',GWA_GRPC_ADDR:'grpc'},config:{profile:{data_policy:'upgrade'}}}));
      if(args[0]==='_images' && Deno.env.get('SLOW_START')) {
        const script = "const dir="+JSON.stringify(dir)+";await Deno.writeTextFile(dir+'/nested.pid',String(Deno.pid));let n=0;setInterval(()=>Deno.writeTextFileSync(dir+'/heartbeat',String(++n)),10);await new Promise(()=>{});";
        const nested = new Deno.Command(Deno.execPath(),{args:['eval',script]}).spawn();
        await nested.status;
      }
      if(args[0]==='_ready' && args[2]==='engine' && Deno.env.get('START_FAIL')) Deno.exit(17);
      if(args[0]==='_down' && Deno.env.get('DOWN_FAIL')) Deno.exit(19);
    `,
    podman: common + `
      if(args[0]==='container' && args[1]==='exists') Deno.exit(1);
      if(args[0]==='container' && args[1]==='inspect') {
        for(const unit of ['db','engine']) console.log(JSON.stringify({Running:!(unit==='engine' && Deno.env.get('HEALTH_FAIL')),Health:{Status:'healthy'}}));
      }
      if(args[0]==='logs') {
        console.log('streaming '+args.at(-1));
        await new Promise(resolve=>{
          Deno.addSignalListener('SIGTERM',()=>resolve());
          Deno.addSignalListener('SIGINT',()=>resolve());
        });
      }
    `,
  };
  for (const [name, code] of Object.entries(commands)) {
    const path = `${dir}/bin/${name}`;
    await Deno.writeTextFile(
      path,
      `#!/usr/bin/env -S deno run --no-config -A\n${code}`,
    );
    await Deno.chmod(path, 0o755);
  }
  const absolute = await Deno.realPath(dir);
  const child = new Deno.Command(Deno.execPath(), {
    args: ["run", "--no-config", "-A", runtime],
    cwd: absolute,
    env: {
      FIXTURE: absolute,
      PATH: `${absolute}/bin:${Deno.env.get("PATH")}`,
      ...extra,
    },
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  let output = "";
  let error = "";
  const read = async (input: ReadableStream<Uint8Array>, stderr: boolean) => {
    for await (const data of input) {
      if (stderr) error += decode.decode(data);
      else output += decode.decode(data);
    }
  };
  const done = Promise.all([
    child.status,
    read(child.stdout, false),
    read(child.stderr, true),
  ])
    .then(([status]) => ({ status, output, error }));
  return {
    dir,
    absolute,
    env: { FIXTURE: absolute, PATH: `${absolute}/bin:${Deno.env.get("PATH")}`, ...extra },
    child,
    done,
    output: () => output,
    calls: async () =>
      (await Deno.readTextFile(`${dir}/calls`)).trim().split("\n").map((s) => JSON.parse(s)),
  };
}

async function finish(f: Awaited<ReturnType<typeof fixture>>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      f.done,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          try {
            f.child.kill("SIGKILL");
          } catch { /* exited */ }
          reject(new Error("session test deadline"));
        }, 10000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

Deno.test("foreground session streams both units, retains data and drains on SIGINT", async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 150 && !f.output().includes("Server ready"); i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    assert(f.output().includes("Server ready"), f.output());
    f.child.kill("SIGINT");
    const result = await finish(f);
    assert(result.status.success, result.error);
    assert(result.output.includes("[db] streaming"));
    assert(result.output.includes("[engine] streaming"));
    const calls = await f.calls();
    equal(calls.filter((a) => a[0] === "_images").length, 1);
    equal(calls.filter((a) => a[0] === "_down").length, 1);
    equal(calls.filter((a) => a[0] === "_reset").length, 0);
    assert(
      calls.findIndex((a) => a[0] === "_db" && a[1] === "ensure") <
        calls.findIndex((a) => a[0] === "_up" && a[2] === "engine"),
    );
    assert(
      !(await Array.fromAsync(Deno.readDir(`${f.dir}/.state`))).some((e) =>
        e.name.endsWith(".session")
      ),
    );
  } finally {
    await Deno.remove(f.dir, { recursive: true });
  }
});

for (
  const [name, extra] of [
    ["startup failure", { START_FAIL: "1" }],
    ["workload failure", { HEALTH_FAIL: "1" }],
    ["startup and cleanup failure", { START_FAIL: "1", DOWN_FAIL: "1" }],
  ] as const
) {
  Deno.test(`${name} stops both units and remains a failure`, async () => {
    const f = await fixture(extra);
    try {
      const result = await finish(f);
      assert(!result.status.success);
      equal((await f.calls()).filter((a) => a[0] === "_down").length, 1);
      if ("START_FAIL" in extra) {
        assert(
          result.error.includes("_ready dev engine failed (17)"),
          result.error,
        );
      }
      if ("DOWN_FAIL" in extra) {
        assert(result.error.includes("Cleanup failed"), result.error);
      }
    } finally {
      await Deno.remove(f.dir, { recursive: true });
    }
  });
}

Deno.test("SIGTERM during startup cancels descendants before cleanup", async () => {
  const f = await fixture({ SLOW_START: "1" });
  let pid: number | undefined;
  try {
    for (let i = 0; i < 200; i++) {
      try {
        pid = Number(await Deno.readTextFile(`${f.dir}/nested.pid`));
        break;
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert(pid, "nested startup process did not start");
    await new Promise((resolve) => setTimeout(resolve, 30));
    f.child.kill("SIGTERM");
    const result = await finish(f);
    assert(result.status.success, result.error);
    const beat = await Deno.readTextFile(`${f.dir}/heartbeat`);
    await new Promise((resolve) => setTimeout(resolve, 60));
    equal(await Deno.readTextFile(`${f.dir}/heartbeat`), beat);
    equal((await f.calls()).filter((a) => a[0] === "_up").length, 0);
    equal((await f.calls()).filter((a) => a[0] === "_down").length, 1);
  } finally {
    if (pid) {
      try {
        Deno.kill(pid, "SIGKILL");
      } catch { /* already stopped */ }
    }
    await Deno.remove(f.dir, { recursive: true });
  }
});

Deno.test("public stop coordinates with the foreground session", async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 150 && !f.output().includes("Server ready"); i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert(f.output().includes("Server ready"), f.output());
    const stop = await new Deno.Command(Deno.execPath(), {
      args: ["run", "--no-config", "-A", runtime, "stop", "dev"],
      cwd: f.absolute,
      env: f.env,
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert(stop.success, decode.decode(stop.stderr));
    assert((await finish(f)).status.success);
    equal((await f.calls()).filter((a) => a[0] === "_down").length, 1);
  } finally {
    await Deno.remove(f.dir, { recursive: true });
  }
});
