import { assert, equal } from "../../helpers/assert.ts";
import { just, template } from "../../helpers/template.ts";

Deno.test("configuration projects credentials privately and observation does not rewrite it", async () => {
  const dir = await template("config");
  try {
    const env = { GWA_PROJECT: "gwa-test-config" };
    const result = await just(dir, ["_environment", "dev"], env);
    assert(result.success, result.stderr);
    const configPath = `${dir}/.state/gwa-test-config.toml`;
    const statePath = `${dir}/.state/gwa-test-config.json`;
    const before = (await Deno.stat(statePath)).mtime!.getTime();
    const config = await Deno.readTextFile(configPath);
    assert(!config.includes("gwa-development-token"));
    assert(!config.includes("gwa-development-password"));
    assert(!config.includes("data_policy"));
    const state = JSON.parse(await Deno.readTextFile(statePath));
    equal(state.env.GWA_API_TOKEN, "gwa-development-token");
    equal(state.config.profile.data_policy, "upgrade");
    if (Deno.build.os !== "windows") {
      equal((await Deno.stat(statePath)).mode! & 0o777, 0o600);
      equal((await Deno.stat(configPath)).mode! & 0o777, 0o644);
    }
    const observed = await just(dir, ["_state", "dev"], env);
    assert(observed.success, observed.stderr);
    equal((await Deno.stat(statePath)).mtime!.getTime(), before);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("configuration rejects port collisions, unsafe projects and implicit production credentials", async () => {
  const dir = await template("guards");
  try {
    for (
      const env of [
        {
          GWA_PROJECT: "gwa-test-ports",
          GWA_HTTP_PORT: "8000",
          GWA_DB_PORT: "8000",
        },
        { GWA_PROJECT: "other-project" },
        { GWA_PROJECT: "gwa-prod" },
      ] as Record<string, string>[]
    ) {
      assert(!(await just(dir, ["_environment", "dev"], env)).success);
    }
    assert(
      !(await just(dir, ["_environment", "prod"], {
        GWA_PROJECT: "gwa-prod",
        GWA_API_TOKEN: "",
        GWA_DB_PASSWORD: "",
      })).success,
    );
    assert(
      (await just(dir, ["_environment", "prod"], {
        GWA_PROJECT: "gwa-prod",
        GWA_API_TOKEN: "explicit-test-production-token-123",
        GWA_DB_PASSWORD: "explicit-test-production-password-123",
      })).success,
    );
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
