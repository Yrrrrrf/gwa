import { createApiClient } from "../lib/client.ts";
import { withCleanup, getToken } from "../lib/fixtures.ts";
import { probeApi } from "../lib/health.ts";
import { StackUnavailableError } from "../lib/errors.ts";
import { resetCounts, printSummary } from "../lib/assert.ts";
import { load } from "@std/dotenv";

export async function withApiEnv(
  name: string, 
  fn: (ctx: { api: any; token: string; cleanup: (fn: () => Promise<void>) => void }) => Promise<void>
) {
  await load({ export: true, envPath: "../.env" });

  const port = Deno.env.get("PORT") || Deno.env.get("API_PORT") || "3000";
  const baseUrl = `http://localhost:${port}/graphql`;
  const rootUrl = `http://localhost:${port}`;

  if (!await probeApi(rootUrl)) {
    throw new StackUnavailableError("Rust Engine", rootUrl);
  }

  const api = createApiClient({ baseUrl });
  const token = await getToken(api);
  
  const { register, run } = withCleanup();

  resetCounts();
  console.log(`\n--- Running API Test: ${name} ---`);
  try {
    await fn({ api, token, cleanup: register });
  } finally {
    printSummary();
    await run();
  }
}
