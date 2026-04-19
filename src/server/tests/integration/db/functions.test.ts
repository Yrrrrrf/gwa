import { withSurrealEnv } from "../../fixtures/surreal_env.ts";
import { assertOk } from "../../lib/assert.ts";
import { assertExists, assertGreaterOrEqual } from "@std/assert";

Deno.test("🗄️ DB Custom Functions", async (t) => {
  await withSurrealEnv("Functions Validation", async ({ surreal, cleanup }) => {
    
    await t.step("F1: fn::search_items (Full-text)", async () => {
      // Seed data has 'Hiking' in title
      const res = await surreal.sql(`RETURN fn::search_items('hiking', 5);`);
      const actualRes = res.find((r: any) => !(r.result?.database && r.result?.namespace));
      assertGreaterOrEqual(actualRes.result.length, 1, "Should find at least one item matching 'hiking'");
      assertOk("Full-text search function works", res);
    });

    await t.step("F2: fn::popular_items", async () => {
      const res = await surreal.sql(`RETURN fn::popular_items(3);`);
      const actualRes = res.find((r: any) => !(r.result?.database && r.result?.namespace));
      assertGreaterOrEqual(actualRes.result.length, 1, "Should return popular items");
      assertOk("Popular items function works", res);
    });

    await t.step("F3: fn::items_near (Geospatial)", async () => {
      // Create a test item with coordinates
      const itemId = `item:geo_${Math.random().toString(36).slice(2, 7)}`;
      // coordinates: (lon, lat) in SurrealQL
      const res0 = await surreal.sql(`CREATE ${itemId} SET title='Geo Item', status='active', coordinates=(-74.0060, 40.7128), tags=[];`);
      assertOk("Geo item created", res0);
      cleanup(async () => { await surreal.sql(`DELETE ${itemId};`); });
      
      await new Promise(r => setTimeout(r, 100));

      // Search near NYC (-74.0060, 40.7128)
      const res = await surreal.sql(`RETURN fn::items_near((-74.0060, 40.7128), 10);`);
      const actualRes = res.find((r: any) => !(r.result?.database && r.result?.namespace));
      assertGreaterOrEqual(actualRes.result.length, 1, "Should find the item we just created");
      assertOk("Geospatial search function works", res);
    });

  });
});
