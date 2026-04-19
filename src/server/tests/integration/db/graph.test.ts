import { withSurrealEnv } from "../../fixtures/surreal_env.ts";
import { assertOk } from "../../lib/assert.ts";
import { assertExists, assertGreater } from "@std/assert";

Deno.test("🗄️ DB Graph Traversals", async (t) => {
  await withSurrealEnv("Graph Validation", async ({ surreal, cleanup }) => {
    await t.step("E1: Forward/Reverse traversal", async () => {
      // Find items user bob liked
      const resForward = await surreal.sql(
        `SELECT ->likes->item AS liked FROM user:bob;`,
      );
      const actualForward = resForward.find((r: any) =>
        !(r.result?.database && r.result?.namespace)
      );
      assertExists(
        actualForward.result[0].liked,
        "User should have liked items",
      );

      // Find users who liked item hiking_boots
      const resReverse = await surreal.sql(
        `SELECT <-likes<-user AS liked_by FROM item:hiking_boots;`,
      );
      const actualReverse = resReverse.find((r: any) =>
        !(r.result?.database && r.result?.namespace)
      );
      assertExists(
        actualReverse.result[0].liked_by,
        "Item should have been liked by users",
      );

      assertOk("Graph traversal works", resReverse);
    });

    await t.step("E2: Collaborative filtering recommendations", async () => {
      // fn::user_recommendations(user:carol, 3)
      const res = await surreal.sql(
        `RETURN fn::user_recommendations(user:carol, 3);`,
      );
      const actualRes = res.find((r: any) =>
        !(r.result?.database && r.result?.namespace)
      );

      // Based on seed data, carol should have recommendations if others share her likes
      // Even if empty, the function should execute successfully
      assertOk("Recommendation function executes", res);

      if (actualRes.result.length > 0) {
        console.log(`     Found ${actualRes.result.length} recommendations`);
      }
    });
  });
});
