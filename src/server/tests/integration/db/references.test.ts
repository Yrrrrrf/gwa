import { describe, expect, it } from "vite-plus/test";
import { withSurrealEnv } from "../../fixtures/surreal_env.ts";
import { expectOk } from "../../lib/assert-db.ts";

describe("🗄️ DB Referential Integrity", () => {
  it("cascades deletion from user to session", async () => {
    await withSurrealEnv("Reference Validation", async ({ surreal }) => {
      // 1. Create a user
      const userId = `user:ref_${Math.random().toString(36).slice(2, 7)}`;
      await surreal.query(
        `CREATE ${userId} SET email='ref@test.com', username='ref', role='user', password_hash='x';`,
      );

      // 2. Create a session for that user
      const sessionId = `session:ref_${Math.random().toString(36).slice(2, 7)}`;
      await surreal.query(
        `CREATE ${sessionId} SET user=${userId}, token='abc', expires_at=time::now()+1d;`,
      );

      // 3. Delete the user
      await surreal.query(`DELETE ${userId};`);

      // Delay for event - increase to 200ms
      await new Promise((r) => setTimeout(r, 200));

      // 4. Verify session is gone
      const res = await surreal.query(`SELECT * FROM ${sessionId};`);
      const actualRes = res.find(
        (r: any) => !(r.result?.database && r.result?.namespace),
      );
      if (actualRes.result.length > 0) {
        console.log("Remaining Session:", JSON.stringify(actualRes.result));
      }
      expect(actualRes.result.length).toBe(0);
      expectOk(res);
    });
  });
});
