import { createSurrealClient } from "../lib/clients/surreal.ts";
import { withCleanup } from "../lib/fixtures.ts";
import { probeSurreal } from "../lib/health.ts";
import { StackUnavailableError } from "../lib/errors.ts";
import { config } from "dotenv";

config({ path: "../.env" });

export async function withSurrealEnv(
  name: string,
  fn: (
    ctx: { surreal: any; cleanup: (fn: () => Promise<void>) => void },
  ) => Promise<void>,
) {
  const user = process.env.SURREAL_USER || "root";
  const pass = process.env.SURREAL_PASS || "root";
  const port = process.env.SURREAL_PORT || "8000";
  const baseUrl = `http://localhost:${port}`;

  if (!await probeSurreal(baseUrl)) {
    throw new StackUnavailableError("SurrealDB", baseUrl);
  }

  const surreal = createSurrealClient({ baseUrl, user, pass });
  const { register, run } = withCleanup();

  register(async () => {
    await surreal.close();
  });

  console.log(`\n--- Running DB Test: ${name} ---`);
  try {
    await fn({ surreal, cleanup: register });
  } finally {
    await run();
  }
}
