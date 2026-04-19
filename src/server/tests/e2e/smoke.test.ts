import { withSurrealEnv } from "../fixtures/surreal_env.ts";
import { assertOk, printSummary } from "../lib/assert.ts";
import { assertEquals, assertGreaterOrEqual } from "@std/assert";

Deno.test("🚀 E2E Smoke Test", async (t) => {
  await withSurrealEnv("Full Smoke", async ({ surreal }) => {
    
    await t.step("S1: Seed counts verification", async () => {
      const resUsers = await surreal.sql("SELECT count() FROM user GROUP ALL;");
      const resItems = await surreal.sql("SELECT count() FROM item GROUP ALL;");
      
      const actualUsers = resUsers.find((r: any) => !(r.result?.database && r.result?.namespace));
      const actualItems = resItems.find((r: any) => !(r.result?.database && r.result?.namespace));

      assertGreaterOrEqual(actualUsers.result[0]?.count || 0, 4, "Should have at least 4 users");
      assertGreaterOrEqual(actualItems.result[0]?.count || 0, 6, "Should have at least 6 items");
      assertOk("Seed data present", resItems);
    });

    await t.step("S2: Full-text search smoke", async () => {
      const res = await surreal.sql("SELECT * FROM item WHERE title @@ 'Hiking';");
      const actualRes = res.find((r: any) => !(r.result?.database && r.result?.namespace));
      assertGreaterOrEqual(actualRes.result.length, 1, "Should find 'Hiking' via FTS");
      assertOk("FTS works", res);
    });

    printSummary();
  });
});
