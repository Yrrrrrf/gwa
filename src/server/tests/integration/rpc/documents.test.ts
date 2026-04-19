import { withRpcEnv } from "../../fixtures/rpc_env.ts";
import { assertOk } from "../../lib/assert.ts";
import { assertEquals, assertExists } from "@std/assert";
import { getToken } from "../../lib/fixtures.ts";
import { createApiClient } from "../../lib/client.ts";

Deno.test("🐹 RPC Document Service", async (t) => {
  await withRpcEnv("Documents", async ({ rpc }) => {
    
    await t.step("D1: Generate document", async () => {
      // Get a real token for the sidecar
      const api = createApiClient({ baseUrl: "http://localhost:3000/graphql" });
      const token = await getToken(api);

      const res = await rpc.call("template.v1.DocumentService", "Generate", {
        template_id: "invoice",
        data: { record_id: "item:test" },
        format: "pdf"
      }, {
        "Authorization": `Bearer ${token}`
      });
      
      assertExists(res.job_id);
      assertEquals(res.status, "pending");
      assertOk("Document generation started", res);
    });

  });
});
