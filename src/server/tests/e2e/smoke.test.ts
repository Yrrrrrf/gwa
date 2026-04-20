import { describe, expect, it } from "vite-plus/test";
import { withE2eEnv } from "../fixtures/e2e_env.ts";
import { expectOk } from "../lib/assert-db.ts";
import { NotifierService } from "../gen/template/v1/notify_connect.ts";

describe("🚀 E2E Smoke Tests (Cross-Path)", () => {
  it("Engine read round-trip → SDK cross-verify", async () => {
    await withE2eEnv("E1: Read Cross-Verify", async ({ api, surreal }) => {
      // 1. Query items via GQL
      const gql = `{ items { id title rating } }`;
      const resGql = await api.query(gql);
      expect(resGql.data.items).toBeDefined();
      expect(resGql.data.items.length).toBeGreaterThan(0);

      const firstItem = resGql.data.items[0];

      // 2. Query SAME item via SDK
      const resSdk = await surreal.query(`SELECT * FROM ${firstItem.id};`);
      const actualSdk = resSdk.find(
        (r: any) => !(r.result?.database && r.result?.namespace),
      );

      expectOk({ data: null, ...actualSdk }); // Pseudo expectOk
      expect(actualSdk.result[0].title).toBe(firstItem.title);
      expect(actualSdk.result[0].rating).toBe(firstItem.rating);
    });
  });

  it("Full-text search cross-verify", async () => {
    await withE2eEnv("E2: Search Cross-Verify", async ({ api, surreal }) => {
      // 1. Search via SDK
      const resSdk = await surreal.query(
        "SELECT id FROM item WHERE title @@ 'Hiking';",
      );
      const actualSdk = resSdk.find(
        (r: any) => !(r.result?.database && r.result?.namespace),
      );
      expect(actualSdk.result.length).toBeGreaterThan(0);
      const sdkIds = actualSdk.result.map((r: any) => r.id);

      // 2. List via GQL (since search isn't exposed in GQL yet, we just assert the items exist in the list)
      const gql = `{ items { id } }`;
      const resGql = await api.query(gql);
      const gqlIds = resGql.data.items.map((i: any) => i.id);

      // 3. SDK hits must be a subset of GQL hits
      for (const id of sdkIds) {
        expect(gqlIds).toContain(id);
      }
    });
  });

  it("RPC Notifier dispatch round-trip", async () => {
    await withE2eEnv("E3: RPC Dispatch", async ({ rpc }) => {
      const client = rpc.getService(NotifierService);
      const res = await client.dispatch({
        orderId: "smoke-e2e-1",
        channel: "email",
        recipient: "e2e@example.com",
        templateKey: "welcome",
        locale: "en",
        subject: "E2E Test",
        body: "Hello from E2E",
      });

      expect(res.success).toBe(true);
      expect(res.message).toBe("Notification queued");
      // Note: side-effect (email sent) is unobservable per spec §3.7.
    });
  });
});
