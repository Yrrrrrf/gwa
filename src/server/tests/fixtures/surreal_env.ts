import { createSurrealClient } from "../lib/client.ts";
import { withCleanup } from "../lib/fixtures.ts";
import { load } from "@std/dotenv";

export async function withSurrealEnv(
  name: string, 
  fn: (ctx: { surreal: any; cleanup: (fn: () => Promise<void>) => void }) => Promise<void>
) {
  // Load .env from parent dir
  await load({ export: true, envPath: "../.env" });

  const user = Deno.env.get("SURREAL_USER") || "root";
  const pass = Deno.env.get("SURREAL_PASS") || "root";
  const port = Deno.env.get("SURREAL_PORT") || "8000";
  const baseUrl = `http://localhost:${port}`;

  const surreal = createSurrealClient({ baseUrl, user, pass });
  const { register, run } = withCleanup();

  console.log(`\n--- Running DB Test: ${name} ---`);
  try {
    await fn({ surreal, cleanup: register });
  } finally {
    await run();
  }
}
