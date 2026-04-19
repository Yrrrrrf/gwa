import { withSurrealEnv } from "../../fixtures/surreal_env.ts";
import { assertOk, printSummary } from "../../lib/assert.ts";
import { assertEquals, assertExists } from "@std/assert";

Deno.test("🗄️ DB Audit Events", async (t) => {
  await withSurrealEnv("Audit Events Validation", async ({ surreal, cleanup }) => {
    
    await t.step("D1: Comment creates activity record", async () => {
      const itemId = `item:test_${Math.random().toString(36).slice(2, 7)}`;
      await surreal.sql(`CREATE ${itemId} SET title='Audit Test', status='active';`);
      cleanup(async () => { await surreal.sql(`DELETE ${itemId};`); });

      await surreal.sql(`RELATE user:alice->comment->${itemId} SET rating=5;`);
      
      const res = await surreal.sql(`SELECT * FROM activity WHERE type = 'comment.created' AND target_item = ${itemId};`);
      const actualRes = res.find((r: any) => !(r.result?.database && r.result?.namespace));
      assertExists(actualRes.result[0], "Activity record should exist");
      assertEquals(actualRes.result[0].target_user, "user:alice");
      assertOk("Comment audit activity created", res);
    });

    await t.step("D2: Like creates activity record", async () => {
      const itemId = `item:test_${Math.random().toString(36).slice(2, 7)}`;
      await surreal.sql(`CREATE ${itemId} SET title='Like Audit Test', status='active', tags=[];`);
      cleanup(async () => { await surreal.sql(`DELETE ${itemId};`); });

      await surreal.sql(`RELATE user:bob->likes->${itemId};`);
      
      // Delay for event - increase to 200ms
      await new Promise(r => setTimeout(r, 200));
      
      const res = await surreal.sql(`SELECT * FROM activity WHERE type = 'item.liked' AND target_item = ${itemId};`);
      const actualRes = res.find((r: any) => !(r.result?.database && r.result?.namespace));
      if (!actualRes.result?.[0]) {
          console.log("Activity Search Result:", JSON.stringify(actualRes));
      }
      assertExists(actualRes.result[0], "Like activity record should exist");
      assertEquals(actualRes.result[0].target_user, "user:bob");
      assertOk("Like audit activity created", res);
    });

    printSummary();
  });
});
