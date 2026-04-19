import { withRpcEnv } from "../../fixtures/rpc_env.ts";
import { assertOk } from "../../lib/assert.ts";
import { assertEquals } from "@std/assert";
import { getToken } from "../../lib/fixtures.ts";
import { createApiClient } from "../../lib/client.ts";

Deno.test("🐹 RPC Notifier Service", async (t) => {
  await withRpcEnv("Notifier", async ({ rpc }) => {
    await t.step("N1: Dispatch notification", async () => {
      // Get a real token for the sidecar
      const api = createApiClient({ baseUrl: "http://localhost:3000/graphql" });
      const token = await getToken(api);

      const res = await rpc.call("template.v1.NotifierService", "Dispatch", {
        order_id: "test-order",
        channel: "email",
        recipient: "test@example.com",
        template_key: "welcome",
        locale: "en",
        subject: "Welcome!",
        body: "Hello world",
      }, {
        "Authorization": `Bearer ${token}`,
      });

      assertEquals(res.success, true);
      assertOk("Notification dispatched", res);
    });
  });
});
