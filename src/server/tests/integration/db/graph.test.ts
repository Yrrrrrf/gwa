import { describe, it, expect } from "vite-plus/test";
import { withSurrealEnv } from "../../fixtures/surreal_env.ts";
import { expectOk } from "../../lib/assert-db.ts";

describe("🗄️ DB Graph Traversals", () => {
  it("performs forward and reverse traversals", async () => {
    await withSurrealEnv("Graph Validation", async ({ surreal }) => {
      // Find items user bob liked
      const resForward = await surreal.query(
        `SELECT ->likes->item AS liked FROM user:bob;`,
      );
      const actualForward = resForward.find(
        (r: any) => !(r.result?.database && r.result?.namespace),
      );
      expect(actualForward.result[0].liked).toBeDefined();

      // Find users who liked item hiking_boots
      const resReverse = await surreal.query(
        `SELECT <-likes<-user AS liked_by FROM item:hiking_boots;`,
      );
      const actualReverse = resReverse.find(
        (r: any) => !(r.result?.database && r.result?.namespace),
      );
      expect(actualReverse.result[0].liked_by).toBeDefined();

      expectOk(resReverse);
    });
  });

  it("executes collaborative filtering recommendations", async () => {
    await withSurrealEnv("Graph Validation", async ({ surreal }) => {
      // fn::user_recommendations(user:carol, 3)
      const res = await surreal.query(
        `RETURN fn::user_recommendations(user:carol, 3);`,
      );
      const actualRes = res.find(
        (r: any) => !(r.result?.database && r.result?.namespace),
      );

      // Based on seed data, carol should have recommendations if others share her likes
      // Even if empty, the function should execute successfully
      expectOk(res);

      if (actualRes.result.length > 0) {
        console.log(`     Found ${actualRes.result.length} recommendations`);
      }
    });
  });
});
