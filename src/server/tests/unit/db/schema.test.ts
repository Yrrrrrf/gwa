import { describe, it } from "vite-plus/test";
import { withSurrealEnv } from "../../fixtures/surreal_env.ts";
import { expectError, expectOk } from "../../lib/assert-db.ts";

describe("🗄️ DB Schema Assertions", () => {
  it("A1: Invalid email rejected", async () => {
    await withSurrealEnv("Schema Validation", async ({ surreal }) => {
      const res = await surreal.query(
        "CREATE user SET email='not-an-email', username='bad', password_hash='x', role='user';",
      );
      expectError(res);
    });
  });

  it("A2: Invalid role rejected", async () => {
    await withSurrealEnv("Schema Validation", async ({ surreal }) => {
      const res = await surreal.query(
        "CREATE user SET email='role@test.com', username='badrole', password_hash='x', role='hacker';",
      );
      expectError(res);
    });
  });

  it("A3: Invalid item status rejected", async () => {
    await withSurrealEnv("Schema Validation", async ({ surreal }) => {
      const res = await surreal.query(
        "CREATE item SET title='Bad Status', status='deleted', tags=[];",
      );
      expectError(res);
    });
  });

  it("A4: Invalid comment rating rejected", async () => {
    await withSurrealEnv("Schema Validation", async ({ surreal }) => {
      const res = await surreal.query(
        "RELATE user:alice->comment->item:hiking_boots SET rating=6, body='Too good!';",
      );
      expectError(res);
    });
  });

  it("A5: Valid user creation", async () => {
    await withSurrealEnv("Schema Validation", async ({ surreal, cleanup }) => {
      const id = `user:test_${Math.random().toString(36).slice(2, 7)}`;
      const res = await surreal.query(
        `CREATE ${id} SET email='test@example.com', username='testuser', password_hash='x', role='user';`,
      );
      expectOk(res);
      cleanup(async () => {
        await surreal.query(`DELETE ${id};`);
      });
    });
  });
});
