import { withApiEnv } from "../../fixtures/api_env.ts";
import { assertOk } from "../../lib/assert.ts";
import { assertEquals, assertExists } from "@std/assert";

Deno.test("🦀 API Items CRUD", async (t) => {
  await withApiEnv("Items Flow", async ({ api, cleanup }) => {
    
    await t.step("I1: List items", async () => {
      const gql = `{ items(limit: 5) { id title rating } }`;
      const res = await api.query(gql);
      assertExists(res.data.items);
      assertOk("List items success", res);
    });

    await t.step("I2: Create and Delete item", async () => {
      const createGql = `
        mutation CreateItem($input: CreateItemInput!) {
          createItem(input: $input) { id title }
        }
      `;
      const variables = {
        input: {
          title: "API Test Item",
          description: "Created via Deno test",
          status: "active",
          tags: ["tech"]
        }
      };
      
      const res = await api.mutate(createGql, variables);
      const id = res.data.createItem.id;
      assertExists(id);
      assertOk("Create item success", res);

      // Cleanup
      const deleteGql = `mutation DeleteItem($id: String!) { deleteItem(id: $id) }`;
      const delRes = await api.mutate(deleteGql, { id });
      assertEquals(delRes.data.deleteItem, true);
      assertOk("Delete item success", delRes);
    });

  });
});
