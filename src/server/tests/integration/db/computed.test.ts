import { describe, expect, it } from "vite-plus/test";
import { withSurrealEnv } from "../../fixtures/surreal_env.ts";
import { expectOk } from "../../lib/assert-db.ts";

describe("🗄️ DB Computed Stats (Events)", () => {
  it("updates item rating and count when comments are added", async () => {
    await withSurrealEnv(
      "Computed Stats Validation",
      async ({ surreal, cleanup }) => {
        // 1. Create a clean item
        const itemId = `item:test_${Math.random().toString(36).slice(2, 7)}`;
        const res0 = await surreal.query(
          `CREATE ${itemId} SET title='Stat Test', status='active', tags=[];`,
        );
        expectOk(res0);
        cleanup(async () => {
          await surreal.query(`DELETE ${itemId};`);
        });

        // Small delay for consistency
        await new Promise((r) => setTimeout(r, 100));

        // 2. Initial check
        let res = await surreal.query(
          `SELECT rating, comment_count FROM ${itemId};`,
        );
        const actualRes = res.find(
          (r: any) => !(r.result?.database && r.result?.namespace),
        );
        if (!actualRes.result?.[0]) {
          throw new Error(`Item not found after create: ${itemId}`);
        }
        expect(actualRes.result[0].rating).toBe(0);
        expect(actualRes.result[0].comment_count).toBe(0);

        // 3. Add a comment (rating 5)
        const userId = "user:alice";
        await surreal.query(
          `RELATE ${userId}->comment->${itemId} SET rating=5, body='Great!';`,
        );

        // Delay for event
        await new Promise((r) => setTimeout(r, 100));

        // 4. Verify update
        res = await surreal.query(
          `SELECT rating, comment_count FROM ${itemId};`,
        );
        const actualResUpdate = res.find(
          (r: any) => !(r.result?.database && r.result?.namespace),
        );
        expect(actualResUpdate.result[0].rating).toBe(5);
        expect(actualResUpdate.result[0].comment_count).toBe(1);

        // 5. Add another comment (rating 1)
        await surreal.query(
          `RELATE user:bob->comment->${itemId} SET rating=1, body='Bad!';`,
        );

        await new Promise((r) => setTimeout(r, 100));

        res = await surreal.query(
          `SELECT rating, comment_count FROM ${itemId};`,
        );
        const actualResUpdate2 = res.find(
          (r: any) => !(r.result?.database && r.result?.namespace),
        );
        expect(actualResUpdate2.result[0].rating).toBe(3); // (5+1)/2
        expect(actualResUpdate2.result[0].comment_count).toBe(2);

        expectOk(res);
      },
    );
  });
});
