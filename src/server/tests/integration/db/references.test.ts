import { withSurrealEnv } from "../../fixtures/surreal_env.ts";
import { assertOk, assertError, printSummary } from "../../lib/assert.ts";
import { assertEquals } from "@std/assert";

Deno.test("🗄️ DB Referential Integrity", async (t) => {
  await withSurrealEnv("Reference Validation", async ({ surreal, cleanup }) => {
    
    await t.step("G1: ON DELETE CASCADE (User -> Session)", async () => {
      // 1. Create a user
      const userId = `user:ref_${Math.random().toString(36).slice(2, 7)}`;
      await surreal.sql(`CREATE ${userId} SET email='ref@test.com', username='ref', role='user';`);
      
      // 2. Create a session for that user
      const sessionId = `session:ref_${Math.random().toString(36).slice(2, 7)}`;
      await surreal.sql(`CREATE ${sessionId} SET user=${userId}, token='abc', expires_at=time::now()+1d;`);
      
      // 3. Delete the user
      await surreal.sql(`DELETE ${userId};`);
      
      // Delay for event - increase to 200ms
      await new Promise(r => setTimeout(r, 200));
      
      // 4. Verify session is gone
      const res = await surreal.sql(`SELECT * FROM ${sessionId};`);
      const actualRes = res.find((r: any) => !(r.result?.database && r.result?.namespace));
      if (actualRes.result.length > 0) {
          console.log("Remaining Session:", JSON.stringify(actualRes.result));
      }
      assertEquals(actualRes.result.length, 0, "Session should be cascadingly deleted");
      assertOk("CASCADE delete verified", res);
    });

    // Note: REJECT is harder to test without explicit DEFINE FIELD ... REFERENCE ON DELETE REJECT
    // In our schema: user ON session TYPE record<user> REFERENCE ON DELETE CASCADE;
    // Let's check if there is any REJECT. 
    // Tag on Item? 
    // DEFINE FIELD tags ON item TYPE array<record<tag>>; 
    // No explicit REJECT in schema for tag.
  });
});
