import { describe, it, expect } from "vite-plus/test";
import { withApiEnv } from "../../fixtures/api_env.ts";
import { expectOk } from "../../lib/assert-db.ts";

describe("🦀 API Items CRUD", () => {
  it("lists items with a limit", async () => {
    await withApiEnv("I1: List items", async ({ api }) => {
      const gql = `{ items { id title rating } }`;
      const res = await api.query(gql);
      expect(res.data.items).toBeDefined();
      expectOk(res);
    });
  });

  it("creates and deletes an item", async () => {
    await withApiEnv("I2: Create and Delete item", async ({ api }) => {
      const createGql = `
        mutation CreateItem($input: CreateItemInput!) {
          createItem(input: $input) { id title }
        }
      `;
      const variables = {
        input: {
          title: "API Test Item",
          description: "Created via Vitest test",
          status: "active",
          tags: ["tech"],
        },
      };

      const res = await api.mutate(createGql, variables);
      if (!res.data?.createItem) {
          console.error("Create Item Response:", JSON.stringify(res, null, 2));
      }
      const id = res.data.createItem.id;
      expect(id).toBeDefined();
      expectOk(res);

      const deleteGql =
        `mutation DeleteItem($id: String!) { deleteItem(id: $id) }`;
      const delRes = await api.mutate(deleteGql, { id });
      expect(delRes.data.deleteItem).toBe(true);
      expectOk(delRes);
    });
  });
});
