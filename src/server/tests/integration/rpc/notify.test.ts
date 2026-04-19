import { withRpcEnv } from "../../fixtures/rpc_env.ts";
import { assertOk } from "../../lib/assert.ts";
import { assertEquals } from "@std/assert";

Deno.test("🐹 RPC Notifier Service", async (t) => {
  await withRpcEnv("Notifier", async ({ rpc }) => {
    
    await t.step("N1: Dispatch notification", async () => {
      const res = await rpc.call("template.v1.NotifierService", "Dispatch", {
        orderId: "test-order",
        channel: "email",
        recipient: "test@example.com",
        templateKey: "welcome",
        locale: "en",
        subject: "Welcome!",
        body: "Hello world",
      });
      
      assertEquals(res.success, true);
      assertOk("Notification dispatched", res);
    });

  });
});
