import { withRpcEnv } from "../../fixtures/rpc_env.ts";
import { assertOk, printSummary } from "../../lib/assert.ts";
import { assertEquals, assertExists } from "@std/assert";

Deno.test("🐹 RPC Document Service", async (t) => {
  await withRpcEnv("Documents", async ({ rpc }) => {
    
    await t.step("D1: Generate document", async () => {
      const res = await rpc.call("template.v1.DocumentService", "Generate", {
        template: "invoice",
        recordId: "item:test",
      });
      
      assertExists(res.jobId);
      assertEquals(res.status, "pending");
      assertOk("Document generation started", res);
    });

    printSummary();
  });
});
