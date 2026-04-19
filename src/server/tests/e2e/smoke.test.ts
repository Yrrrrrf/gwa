import { describe, it, expect } from "vite-plus/test";
import { withSurrealEnv } from "../fixtures/surreal_env.ts";
import { expectOk } from "../lib/assert-db.ts";

describe("🚀 E2E Smoke Test", () => {
  it("verifies seed counts", async () => {
    await withSurrealEnv("Full Smoke", async ({ surreal }) => {
      const resUsers = await surreal.query("SELECT count() FROM user GROUP ALL;");
      const resItems = await surreal.query("SELECT count() FROM item GROUP ALL;");

      const actualUsers = resUsers.find((r: any) =>
        !(r.result?.database && r.result?.namespace)
      );
      const actualItems = resItems.find((r: any) =>
        !(r.result?.database && r.result?.namespace)
      );

      expect(actualUsers.result[0]?.count || 0).toBeGreaterThanOrEqual(4);
      expect(actualItems.result[0]?.count || 0).toBeGreaterThanOrEqual(6);
      expectOk(resItems);
    });
  });

  it("performs full-text search smoke test", async () => {
    await withSurrealEnv("Full Smoke", async ({ surreal }) => {
      const res = await surreal.query(
        "SELECT * FROM item WHERE title @@ 'Hiking';",
      );
      const actualRes = res.find((r: any) =>
        !(r.result?.database && r.result?.namespace)
      );
      expect(actualRes.result.length).toBeGreaterThanOrEqual(1);
      expectOk(res);
    });
  });
});
