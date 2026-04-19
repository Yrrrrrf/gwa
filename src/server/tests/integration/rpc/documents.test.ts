import { describe, it, expect } from "vite-plus/test";
import { withRpcEnv } from "../../fixtures/rpc_env.ts";
import { expectOk } from "../../lib/assert-db.ts";
import { DocumentService } from "../../gen/template/v1/documents_connect.ts";

describe("🐹 RPC Document Service", () => {
  it("generates a document successfully", async () => {
    await withRpcEnv("D1: Generate document", async ({ rpc }) => {
      const client = rpc.getService(DocumentService);

      const res = await client.generate({
        template: "commerce/invoice",
        recordId: "invoice:123",
      });

      expect(res.success).toBe(true);
      expect(res.url).toBeDefined();
      expectOk(res);
    });
  });
});
