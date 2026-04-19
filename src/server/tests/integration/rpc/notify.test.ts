import { describe, it, expect } from "vite-plus/test";
import { withRpcEnv } from "../../fixtures/rpc_env.ts";
import { expectOk } from "../../lib/assert-db.ts";
import { NotifierService } from "../../gen/template/v1/notify_connect.ts";

describe("🐹 RPC Notifier Service", () => {
  it("dispatches a notification successfully", async () => {
    await withRpcEnv("N1: Dispatch notification", async ({ rpc }) => {
      const client = rpc.getService(NotifierService);

      const res = await client.dispatch({
        orderId: "test-order",
        channel: "email",
        recipient: "test@example.com",
        templateKey: "welcome",
        locale: "en",
        subject: "Welcome!",
        body: "Hello world",
      });

      expect(res.success).toBe(true);
      expectOk(res);
    });
  });
});
