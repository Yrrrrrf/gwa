import { withSurrealEnv } from "../../fixtures/surreal_env.ts";
import { assertError, assertOk } from "../../lib/assert.ts";

Deno.test("🗄️ DB Unique Indexes", async (t) => {
  await withSurrealEnv(
    "Unique Index Validation",
    async ({ surreal, cleanup }) => {
      await t.step("B1: Duplicate user email rejected", async () => {
        const email = `dupe_${Math.random().toString(36).slice(2, 7)}@test.com`;
        const u1 = `u1_${Math.random().toString(36).slice(2, 7)}`;
        const u2 = `u2_${Math.random().toString(36).slice(2, 7)}`;

        // First creation
        const res1 = await surreal.sql(
          `CREATE user SET email='${email}', username='${u1}', password_hash='x', role='user';`,
        );
        assertOk("Initial user created", res1);

        // Duplicate creation
        const res2 = await surreal.sql(
          `CREATE user SET email='${email}', username='${u2}', password_hash='x', role='user';`,
        );
        try {
          assertError("Duplicate email should be rejected", res2);
        } catch (err) {
          console.log("Failed Index Response:", JSON.stringify(res2));
          throw err;
        }
      });

      await t.step("B2: Duplicate tag slug rejected", async () => {
        const slug = `slug_${Math.random().toString(36).slice(2, 7)}`;

        const res1 = await surreal.sql(
          `CREATE tag SET name='T1', slug='${slug}';`,
        );
        assertOk("Initial tag created", res1);

        const res2 = await surreal.sql(
          `CREATE tag SET name='T2', slug='${slug}';`,
        );
        try {
          assertError("Duplicate slug should be rejected", res2);
        } catch (err) {
          console.log("Failed Slug Response:", JSON.stringify(res2));
          throw err;
        }
      });
    },
  );
});
