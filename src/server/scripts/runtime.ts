// Server-only foreground session: bounded log streaming, signals and pod health.
// Recipe/config/container definitions remain in the root Just scripts and Compose.
const decoder = new TextDecoder();
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function command(args: string[], capture = false): Promise<string> {
  const child = new Deno.Command("just", {
    args,
    detached: true,
    stdin: "null",
    stdout: capture ? "piped" : "inherit",
    stderr: capture ? "piped" : "inherit",
  }).spawn();
  if (capture) {
    const output = await child.output();
    if (!output.success) throw new Error(decoder.decode(output.stderr).trim());
    return decoder.decode(output.stdout).trim();
  }
  const status = await child.status;
  if (!status.success) {
    throw new Error(`just ${args.join(" ")} failed (${status.code})`);
  }
  return "";
}

interface Snapshot {
  env: Record<string, string>;
  config: { profile: { data_policy: string } };
}

async function stream(stream: ReadableStream<Uint8Array>, unit: string) {
  let pending = "";
  for await (const chunk of stream.pipeThrough(new TextDecoderStream())) {
    pending += chunk;
    let end: number;
    while ((end = pending.indexOf("\n")) >= 0) {
      console.log(`[${unit}] ${pending.slice(0, end)}`);
      pending = pending.slice(end + 1);
    }
    // A workload writing an indefinitely long line cannot grow this buffer forever.
    if (pending.length > 16384) {
      console.log(`[${unit}] ${pending}`);
      pending = "";
    }
  }
  if (pending) console.log(`[${unit}] ${pending}`);
}

export async function session(profile = "dev") {
  const project = await command(["_project", profile], true);
  await Deno.mkdir(".state", { recursive: true, mode: 0o700 });
  const lock = `.state/${project}.session`;
  try {
    await Deno.mkdir(lock, { mode: 0o700 });
  } catch (error) {
    if (error instanceof Deno.errors.AlreadyExists) {
      throw new Error(
        `A session already owns ${project}; use just stop. See README for stale locks.`,
      );
    }
    throw error;
  }
  const owner = crypto.randomUUID();
  await Deno.writeTextFile(`${lock}/owner`, owner, { mode: 0o600 });
  Deno.env.set("GWA_SESSION", owner);
  let stopping = false;
  let closing = false;
  let active: Deno.ChildProcess | undefined;
  let cancellationDeadline: ReturnType<typeof setTimeout> | undefined;
  const signalGroup = (child: Deno.ChildProcess, signal: Deno.Signal) => {
    try {
      Deno.kill(-child.pid, signal);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  };
  const logs: { child: Deno.ChildProcess; done: Promise<void> }[] = [];
  let failure: unknown;
  let prepared = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    try {
      if (active) {
        const child = active;
        signalGroup(child, "SIGINT");
        cancellationDeadline = setTimeout(() => signalGroup(child, "SIGKILL"), 5000);
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) console.error(error);
    }
  };
  Deno.addSignalListener("SIGINT", stop);
  Deno.addSignalListener("SIGTERM", stop);
  const requests = setInterval(() => {
    try {
      Deno.statSync(`${lock}/stop`);
      stop();
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) failure ??= error;
    }
  }, 200);
  const step = async (...args: string[]) => {
    if (stopping) throw new Error("Session stopping");
    if (failure) throw failure;
    active = new Deno.Command("just", { args, stdin: "null", detached: true }).spawn();
    try {
      const status = await active.status;
      if (!status.success) {
        throw new Error(`just ${args.join(" ")} failed (${status.code})`);
      }
    } finally {
      clearTimeout(cancellationDeadline);
      if (stopping) signalGroup(active, "SIGKILL");
      active = undefined;
    }
    if (stopping) throw new Error("Session stopping");
  };
  const follow = (unit: string) => {
    const child = new Deno.Command("podman", {
      args: ["logs", "--follow", "--tail", "30", `${project}-${unit}`],
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const done = Promise.all([
      child.status,
      stream(child.stdout, unit),
      stream(child.stderr, unit),
    ]).then(([status]) => {
      if (!closing && !stopping) {
        failure ??= new Error(`${unit} log stream exited (${status.code})`);
      }
    }).catch((error) => {
      if (!closing && !stopping) failure ??= error;
    });
    logs.push({ child, done });
  };
  try {
    // Never take over someone else's already running server session.
    for (const unit of ["db", "engine"]) {
      const existing = await new Deno.Command("podman", {
        args: ["container", "exists", `${project}-${unit}`],
        stdout: "null",
        stderr: "null",
      }).output();
      if (existing.code === 0) {
        prepared = false;
        throw new Error(
          `${project}-${unit} already exists; stop the existing stack first`,
        );
      }
      if (existing.code !== 1) {
        throw new Error("Cannot inspect Podman containers");
      }
    }
    await step("_environment", profile);
    prepared = true;
    const state: Snapshot = JSON.parse(
      await command(["_state", profile], true),
    );
    await step("_images", profile);
    if (state.config.profile.data_policy === "reset") {
      await step("_reset", profile);
    }
    await step("_up", profile, "db");
    follow("db");
    await step("_ready", profile, "db");
    await step("_db", "ensure", profile);
    await step("_up", profile, "engine");
    follow("engine");
    await step("_ready", profile, "engine");
    console.log(
      `Server ready | DB ${state.env.GWA_DB_URL} | HTTP ${state.env.GWA_HTTP_URL} | gRPC ${state.env.GWA_GRPC_ADDR}`,
    );
    console.log("Ctrl-C stops both pods and retains database and artifacts.");
    while (!stopping && !failure) {
      const result = await new Deno.Command("podman", {
        args: [
          "container",
          "inspect",
          "--format",
          "{{json .State}}",
          `${project}-db`,
          `${project}-engine`,
        ],
        signal: AbortSignal.timeout(5000),
        stdout: "piped",
        stderr: "piped",
      }).output();
      if (!result.success) {
        throw new Error(
          decoder.decode(result.stderr).trim() || "Container inspection failed",
        );
      }
      const states = decoder.decode(result.stdout).trim().split("\n").map((
        line,
      ) => JSON.parse(line));
      if (
        states.length !== 2 ||
        states.some((state) => !state.Running || state.Health?.Status === "unhealthy")
      ) {
        if (!stopping) {
          throw new Error("A server workload exited or became unhealthy");
        }
      }
      await delay(500);
    }
    if (failure) throw failure;
  } catch (error) {
    if (!stopping) failure ??= error;
  } finally {
    closing = true;
    clearInterval(requests);
    if (prepared) {
      try {
        await command(["_down", profile]);
      } catch (error) {
        console.error(
          `Cleanup failed: ${error instanceof Error ? error.message : error}`,
        );
        failure ??= error;
      }
    }
    for (const log of logs) {
      try {
        log.child.kill("SIGTERM");
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) failure ??= error;
      }
    }
    await Promise.all(logs.map((log) => log.done));
    Deno.removeSignalListener("SIGINT", stop);
    Deno.removeSignalListener("SIGTERM", stop);
    await Deno.remove(lock, { recursive: true });
  }
  if (failure) throw failure;
}

async function stopSession(profile: string) {
  const project = await command(["_project", profile], true);
  const lock = `.state/${project}.session`;
  try {
    await Deno.writeTextFile(`${lock}/stop`, "stop\n", { mode: 0o600 });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
    await command(["_down", profile]);
    return;
  }
  for (let i = 0; i < 120; i++) {
    await delay(500);
    try {
      await Deno.stat(lock);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) return;
      throw error;
    }
  }
  await command(["_down", profile]);
  throw new Error(
    "Session did not acknowledge stop; pods stopped. Inspect and remove a stale session lock as documented.",
  );
}

if (import.meta.main) {
  try {
    const [action = "run", profile = "dev"] = Deno.args;
    if (action === "run") await session(profile);
    else if (action === "stop") await stopSession(profile);
    else throw new Error("action must be run or stop");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exitCode = 1;
  }
}
