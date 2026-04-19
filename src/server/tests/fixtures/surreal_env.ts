import { createSurrealClient } from "../lib/client.ts";
import { withCleanup } from "../lib/fixtures.ts";
import { probeSurreal } from "../lib/health.ts";
import { StackUnavailableError } from "../lib/errors.ts";
import { printSummary, resetCounts } from "../lib/assert.ts";
import { load } from "@std/dotenv";

export async function withSurrealEnv(
  name: string,
  fn: (
    ctx: { surreal: any; cleanup: (fn: () => Promise<void>) => void },
  ) => Promise<void>,
) {
  // Load .env from parent dir
  await load({ export: true, envPath: "../.env" });

  const user = Deno.env.get("SURREAL_USER") || "root";
  const pass = Deno.env.get("SURREAL_PASS") || "root";
  const port = Deno.env.get("SURREAL_PORT") || "8000";
  const baseUrl = `http://localhost:${port}`;

  if (!await probeSurreal(baseUrl)) {
    throw new StackUnavailableError("SurrealDB", baseUrl);
  }

  const surreal = createSurrealClient({ baseUrl, user, pass });
  const { register, run } = withCleanup();

  resetCounts();
  console.log(`\n--- Running DB Test: ${name} ---`);
  try {
    await fn({ surreal, cleanup: register });
  } finally {
    printSummary();
    await run();
  }
}
