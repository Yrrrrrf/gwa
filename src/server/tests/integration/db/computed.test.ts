import { withSurrealEnv } from "../../fixtures/surreal_env.ts";
import { assertOk } from "../../lib/assert.ts";
import { assertEquals } from "@std/assert";

Deno.test("🗄️ DB Computed Stats (Events)", async (t) => {
  await withSurrealEnv(
    "Computed Stats Validation",
    async ({ surreal, cleanup }) => {
      await t.step("C1: Comment updates item rating and count", async () => {
        // 1. Create a clean item
        const itemId = `item:test_${Math.random().toString(36).slice(2, 7)}`;
        const res0 = await surreal.sql(
          `CREATE ${itemId} SET title='Stat Test', status='active', tags=[];`,
        );
        assertOk("Item created", res0);
        cleanup(async () => {
          await surreal.sql(`DELETE ${itemId};`);
        });

        // Small delay for consistency
        await new Promise((r) => setTimeout(r, 100));

        // 2. Initial check
        let res = await surreal.sql(
          `SELECT rating, comment_count FROM ${itemId};`,
        );
        const actualRes = res.find((r: any) =>
          !(r.result?.database && r.result?.namespace)
        );
        if (!actualRes.result?.[0]) {
          throw new Error(`Item not found after create: ${itemId}`);
        }
        assertEquals(actualRes.result[0].rating, 0);
        assertEquals(actualRes.result[0].comment_count, 0);

        // 3. Add a comment (rating 5)
        const userId = "user:alice";
        await surreal.sql(
          `RELATE ${userId}->comment->${itemId} SET rating=5, body='Great!';`,
        );

        // Delay for event
        await new Promise((r) => setTimeout(r, 100));

        // 4. Verify update
        res = await surreal.sql(`SELECT rating, comment_count FROM ${itemId};`);
        const actualResUpdate = res.find((r: any) =>
          !(r.result?.database && r.result?.namespace)
        );
        assertEquals(actualResUpdate.result[0].rating, 5);
        assertEquals(actualResUpdate.result[0].comment_count, 1);

        // 5. Add another comment (rating 1)
        await surreal.sql(
          `RELATE user:bob->comment->${itemId} SET rating=1, body='Bad!';`,
        );

        await new Promise((r) => setTimeout(r, 100));

        res = await surreal.sql(`SELECT rating, comment_count FROM ${itemId};`);
        const actualResUpdate2 = res.find((r: any) =>
          !(r.result?.database && r.result?.namespace)
        );
        assertEquals(actualResUpdate2.result[0].rating, 3); // (5+1)/2
        assertEquals(actualResUpdate2.result[0].comment_count, 2);

        assertOk("Item stats updated by events", res);
      });
    },
  );
});
