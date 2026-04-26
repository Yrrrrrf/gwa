import { describe, it } from "vite-plus/test";
import { withSurrealEnv } from "../../fixtures/surreal_env.ts";
import { expectError, expectOk } from "../../lib/assert-db.ts";

describe("🗄️ DB Unique Indexes", () => {
  it("rejects duplicate user emails", async () => {
    await withSurrealEnv("Unique Index Validation", async ({ surreal }) => {
      const email = `dupe_${Math.random().toString(36).slice(2, 7)}@test.com`;
      const u1 = `u1_${Math.random().toString(36).slice(2, 7)}`;
      const u2 = `u2_${Math.random().toString(36).slice(2, 7)}`;

      // First creation
      const res1 = await surreal.query(
        `CREATE user SET email='${email}', username='${u1}', password_hash='x', role='user';`,
      );
      expectOk(res1);

      // Duplicate creation
      const res2 = await surreal.query(
        `CREATE user SET email='${email}', username='${u2}', password_hash='x', role='user';`,
      );
      try {
        expectError(res2);
      } catch (err) {
        console.log("Failed Index Response:", JSON.stringify(res2));
        throw err;
      }
    });
  });

  it("rejects duplicate tag slugs", async () => {
    await withSurrealEnv("Unique Index Validation", async ({ surreal }) => {
      const slug = `slug_${Math.random().toString(36).slice(2, 7)}`;

      const res1 = await surreal.query(
        `CREATE tag SET name='T1', slug='${slug}';`,
      );
      expectOk(res1);

      const res2 = await surreal.query(
        `CREATE tag SET name='T2', slug='${slug}';`,
      );
      try {
        expectError(res2);
      } catch (err) {
        console.log("Failed Slug Response:", JSON.stringify(res2));
        throw err;
      }
    });
  });
});
