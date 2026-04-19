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

  // Wait for SurrealDB to be ready
  let ready = false;
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      await res.text(); // Consume body
      if (res.ok) {
        ready = true;
        break;
      }
    } catch (err) {
      // Ignore
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!ready) {
    throw new Error(`SurrealDB not ready at ${baseUrl}`);
  }

  console.log(`\n--- Running DB Test: ${name} ---`);
  try {
    await fn({ surreal, cleanup: register });
  } finally {
    await run();
  }
}
