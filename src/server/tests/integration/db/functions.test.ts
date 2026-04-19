import { describe, it, expect } from "vite-plus/test";
import { withSurrealEnv } from "../../fixtures/surreal_env.ts";
import { expectOk } from "../../lib/assert-db.ts";

describe("🗄️ DB Custom Functions", () => {
  it("performs full-text search via fn::search_items", async () => {
    await withSurrealEnv("Functions Validation", async ({ surreal }) => {
      // Seed data has 'Hiking' in title
      const res = await surreal.query(`RETURN fn::search_items('hiking', 5);`);
      const actualRes = res.find((r: any) =>
        !(r.result?.database && r.result?.namespace)
      );
      expect(actualRes.result.length).toBeGreaterThanOrEqual(1);
      expectOk(res);
    });
  });

  it("returns popular items via fn::popular_items", async () => {
    await withSurrealEnv("Functions Validation", async ({ surreal }) => {
      const res = await surreal.query(`RETURN fn::popular_items(3);`);
      const actualRes = res.find((r: any) =>
        !(r.result?.database && r.result?.namespace)
      );
      expect(actualRes.result.length).toBeGreaterThanOrEqual(1);
      expectOk(res);
    });
  });

  it("performs geospatial search via fn::items_near", async () => {
    await withSurrealEnv("Functions Validation", async ({ surreal, cleanup }) => {
      // Create a test item with coordinates
      const itemId = `item:geo_${Math.random().toString(36).slice(2, 7)}`;
      // coordinates: (lon, lat) in SurrealQL
      const res0 = await surreal.query(
        `CREATE ${itemId} SET title='Geo Item', status='active', coordinates=(-74.0060, 40.7128), tags=[];`,
      );
      expectOk(res0);
      cleanup(async () => {
        await surreal.query(`DELETE ${itemId};`);
      });

      await new Promise((r) => setTimeout(r, 100));

      // Search near NYC (-74.0060, 40.7128)
      const res = await surreal.query(
        `RETURN fn::items_near((-74.0060, 40.7128), 10);`,
      );
      const actualRes = res.find((r: any) =>
        !(r.result?.database && r.result?.namespace)
      );
      expect(actualRes.result.length).toBeGreaterThanOrEqual(1);
      expectOk(res);
    });
  });
});
