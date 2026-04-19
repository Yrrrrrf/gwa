import { withSurrealEnv } from "../../fixtures/surreal_env.ts";
import { assertError, assertOk } from "../../lib/assert.ts";

Deno.test("🗄️ DB Schema Assertions", async (t) => {
  await withSurrealEnv("Schema Validation", async ({ surreal, cleanup }) => {
    await t.step("A1: Invalid email rejected", async () => {
      const res = await surreal.sql(
        "CREATE user SET email='not-an-email', username='bad', password_hash='x', role='user';",
      );
      assertError("Invalid email should be rejected", res);
    });

    await t.step("A2: Invalid role rejected", async () => {
      const res = await surreal.sql(
        "CREATE user SET email='role@test.com', username='badrole', password_hash='x', role='hacker';",
      );
      assertError("Invalid role 'hacker' should be rejected", res);
    });

    await t.step("A3: Invalid item status rejected", async () => {
      const res = await surreal.sql(
        "CREATE item SET title='Bad Status', status='deleted', tags=[];",
      );
      assertError("Invalid status 'deleted' should be rejected", res);
    });

    await t.step("A4: Invalid comment rating rejected", async () => {
      const res = await surreal.sql(
        "RELATE user:alice->comment->item:hiking_boots SET rating=6, body='Too good!';",
      );
      assertError("Rating 6 should be rejected", res);
    });

    await t.step("A5: Valid user creation", async () => {
      const id = `user:test_${Math.random().toString(36).slice(2, 7)}`;
      const res = await surreal.sql(
        `CREATE ${id} SET email='test@example.com', username='testuser', password_hash='x', role='user';`,
      );
      assertOk("Valid user should be created", res);
      cleanup(async () => {
        await surreal.sql(`DELETE ${id};`);
      });
    });
  });
});
