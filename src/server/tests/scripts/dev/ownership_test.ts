import { assert, equal } from "../../helpers/assert.ts";
import { just, template } from "../../helpers/template.ts";

Deno.test("pod/volume ownership and failed removals are enforced by the real recipes", async () => {
  const dir = await template("ownership");
  const project = "gwa-test-ownership";
  const bin = `${dir}/bin`;
  await Deno.mkdir(bin);
  const executable = `${bin}/podman`;
  await Deno.writeTextFile(
    executable,
    `#!/usr/bin/env -S deno run --no-config -A
const a=Deno.args; const mode=Deno.env.get('MODEL_MODE'); const project=Deno.env.get('GWA_PROJECT');
await Deno.writeTextFile(Deno.env.get('MODEL_LOG'), JSON.stringify(a)+'\\n',{append:true});
const [kind,action,name]=a;
if(action==='exists') {
 if(kind==='volume' || (['foreign-pod','owned'].includes(mode) && ['pod','container'].includes(kind))) Deno.exit(0);
 Deno.exit(1);
}
if(action==='inspect') {
 const owner=mode==='foreign-pod'?'other':project;
 if(kind==='pod') console.log(JSON.stringify([{Labels:{gwa_project:owner}}]));
 if(kind==='container') console.log(JSON.stringify([{Config:{Labels:{'io.podman.compose.project':project+'-db'}}}]));
 if(kind==='volume') console.log(JSON.stringify([{Labels:{gwa_project:mode==='foreign-volume'&&name.endsWith('artifacts')?'other':project}}]));
}
if(kind==='volume' && action==='rm' && mode==='remove-fails') {console.error('injected removal failure');Deno.exit(7);}
`,
  );
  await Deno.chmod(executable, 0o755);
  const env = {
    GWA_PROJECT: project,
    PATH: `${bin}:${Deno.env.get("PATH")}`,
    MODEL_LOG: `${dir}/commands`,
  };
  try {
    assert((await just(dir, ["_environment", "dev"], env)).success);
    const owned = await just(dir, ["_ownership", "dev", "db"], { ...env, MODEL_MODE: "owned" });
    assert(owned.success, owned.stderr);
    const foreignPod = await just(dir, ["_up", "dev", "db"], { ...env, MODEL_MODE: "foreign-pod" });
    assert(
      !foreignPod.success && foreignPod.stderr.includes("refusing unowned pod"),
      foreignPod.stderr,
    );
    await Deno.writeTextFile(env.MODEL_LOG, "");
    const foreignVolume = await just(dir, ["_reset", "dev", "no"], {
      ...env,
      MODEL_MODE: "foreign-volume",
    });
    assert(
      !foreignVolume.success && foreignVolume.stderr.includes("refusing unowned volume"),
      foreignVolume.stderr,
    );
    const calls = (await Deno.readTextFile(env.MODEL_LOG)).trim().split("\n").map((s) =>
      JSON.parse(s)
    );
    equal(calls.filter((a) => a[0] === "volume" && a[1] === "rm").length, 0);
    const failure = await just(dir, ["_reset", "dev", "no"], {
      ...env,
      MODEL_MODE: "remove-fails",
    });
    assert(!failure.success && failure.stderr.includes("injected removal failure"), failure.stderr);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
