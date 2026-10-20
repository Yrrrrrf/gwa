import { assert, equal } from "../../helpers/assert.ts";
import { sql } from "../../helpers/database.ts";
import { just, succeeds, template } from "../../helpers/template.ts";

Deno.test("ensure initializes once, upgrades retained data, rejects drift and preserves competing locks", async () => {
  const dir = await template("migrations");
  const database = `migration_${crypto.randomUUID().replaceAll("-", "")}`;
  const env = {
    ...Deno.env.toObject(),
    GWA_PROJECT: `gwa-test-${crypto.randomUUID()}`,
    GWA_DB_NAME: database,
  };
  const query = (text: string) => sql(text, database, env);
  try {
    await succeeds(dir, ["_environment", "dev"], env);
    await succeeds(dir, ["_db", "init", "dev", "0001-baseline"], env);
    await query('UPDATE item:fixture SET title = "Retained across upgrade";');
    await succeeds(dir, ["_db", "ensure", "dev"], env);
    await succeeds(dir, ["_db", "ensure", "dev"], env);
    equal(
      (await query("SELECT title FROM item:fixture;"))[0].result[0].title,
      "Retained across upgrade",
    );
    equal((await query("SELECT * FROM migration;"))[0].result.length, 2);
    assert(!(await just(dir, ["_db", "init", "dev"], env)).success);

    await query(
      'CREATE migration_lock:active SET owner = "other-runner", acquired_at = time::now();',
    );
    assert(!(await just(dir, ["_db", "ensure", "dev"], env)).success);
    equal((await query("SELECT * FROM migration_lock:active;"))[0].result[0].owner, "other-runner");
    await query('DELETE migration_lock:active WHERE owner = "other-runner";');

    const baseline = `${dir}/db/definitions/tables/domain.surql`;
    const original = await Deno.readTextFile(baseline);
    await Deno.writeTextFile(baseline, `${original}\n-- modified applied baseline\n`);
    assert(!(await just(dir, ["_db", "ensure", "dev"], env)).success);
    await Deno.writeTextFile(baseline, original);

    const broken = `${dir}/db/migrations/9999-failed.surql`;
    await Deno.writeTextFile(
      broken,
      'UPDATE item:fixture SET title = "Must roll back"; THROW "intentional migration failure";',
    );
    assert(!(await just(dir, ["_db", "ensure", "dev"], env)).success);
    equal(
      (await query("SELECT title FROM item:fixture;"))[0].result[0].title,
      "Retained across upgrade",
    );
    equal((await query("SELECT * FROM migration;"))[0].result.length, 2);
    equal((await query("SELECT * FROM migration_lock;"))[0].result.length, 0);
    await Deno.remove(broken);
    await succeeds(dir, ["_db", "verify", "dev"], env);
  } finally {
    try {
      await query(`REMOVE DATABASE ${database};`);
    } finally {
      await Deno.remove(dir, { recursive: true });
    }
  }
});
