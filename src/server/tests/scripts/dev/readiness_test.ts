import { assert } from "../../helpers/assert.ts";
import { just, template } from "../../helpers/template.ts";

for (const mode of ["eventually-ready", "unhealthy", "deadline"] as const) {
  Deno.test(`readiness: ${mode}`, async () => {
    const dir = await template(`ready-${mode}`);
    let requests = 0;
    const server = Deno.serve({ hostname: "127.0.0.1", port: 0, onListen: () => {} }, () => {
      requests++;
      const ready = mode === "eventually-ready" && requests >= 3;
      return Response.json({ ready }, { status: ready ? 200 : 503 });
    });
    try {
      const config = `${dir}/config/database.toml`;
      await Deno.writeTextFile(
        config,
        (await Deno.readTextFile(config))
          .replace("readiness_timeout_seconds = 60", "readiness_timeout_seconds = 1")
          .replace("readiness_delay_ms = 500", "readiness_delay_ms = 50"),
      );
      await Deno.mkdir(`${dir}/bin`);
      const podman = `${dir}/bin/podman`;
      await Deno.writeTextFile(
        podman,
        `#!/usr/bin/env -S deno run --no-config -A
if(Deno.args[0]==='container') console.log(JSON.stringify([{State:{Running:true,Health:{Status:${
          JSON.stringify(mode === "unhealthy" ? "unhealthy" : "healthy")
        }}}}]));
`,
      );
      await Deno.chmod(podman, 0o755);
      const env = {
        GWA_PROJECT: "gwa-test-readiness",
        GWA_HTTP_PORT: String(server.addr.port),
        PATH: `${dir}/bin:${Deno.env.get("PATH")}`,
      };
      const projection = await just(dir, ["_environment", "dev"], env);
      assert(projection.success, projection.stderr);
      const result = await just(dir, ["_ready", "dev", "engine"], env);
      if (mode === "eventually-ready") {
        assert(result.success, result.stderr);
        assert(requests >= 3);
      } else {
        assert(!result.success);
        const expected = mode === "deadline"
          ? "readiness deadline exceeded"
          : "container failed before readiness";
        assert(result.stderr.includes(expected), result.stderr);
        if (mode === "unhealthy") assert(requests === 0);
      }
    } finally {
      await server.shutdown();
      await server.finished;
      await Deno.remove(dir, { recursive: true });
    }
  });
}
