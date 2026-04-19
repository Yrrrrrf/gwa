import { describe, it, expect } from "vite-plus/test";
import { withSurrealEnv } from "../../fixtures/surreal_env.ts";
import { expectOk } from "../../lib/assert-db.ts";

describe("🗄️ DB Audit Events", () => {
  it("creates an activity record when a comment is added", async () => {
    await withSurrealEnv("D1: Comment creates activity record", async ({ surreal, cleanup }) => {
      const itemId = `item:test_${Math.random().toString(36).slice(2, 7)}`;
      await surreal.query(
        `CREATE ${itemId} SET title='Audit Test', status='active', tags=[];`,
      );
      cleanup(async () => {
        await surreal.query(`DELETE ${itemId};`);
      });

      await surreal.query(
        `RELATE user:alice->comment->${itemId} SET rating=5;`,
      );

      const res = await surreal.query(
        `SELECT * FROM activity WHERE type = 'comment.created' AND target_item = ${itemId};`,
      );
      const actualRes = res.find((r: any) =>
        !(r.result?.database && r.result?.namespace)
      );
      expect(actualRes.result[0]).toBeDefined();
      expect(actualRes.result[0].target_user).toBe("user:alice");
      expectOk(res);
    });
  });

  it("creates an activity record when an item is liked", async () => {
    await withSurrealEnv("D2: Like creates activity record", async ({ surreal, cleanup }) => {
      const itemId = `item:test_${Math.random().toString(36).slice(2, 7)}`;
      await surreal.query(
        `CREATE ${itemId} SET title='Like Audit Test', status='active', tags=[];`,
      );
      cleanup(async () => {
        await surreal.query(`DELETE ${itemId};`);
      });

      await surreal.query(`RELATE user:bob->likes->${itemId};`);

      await new Promise((r) => setTimeout(r, 200));

      const res = await surreal.query(
        `SELECT * FROM activity WHERE type = 'item.liked' AND target_item = ${itemId};`,
      );
      const actualRes = res.find((r: any) =>
        !(r.result?.database && r.result?.namespace)
      );
      expect(actualRes.result[0]).toBeDefined();
      expect(actualRes.result[0].target_user).toBe("user:bob");
      expectOk(res);
    });
  });
});
