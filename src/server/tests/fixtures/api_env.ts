import { createEngineClient } from "../lib/clients/engine.ts";
import { getToken, withCleanup } from "../lib/fixtures.ts";
import { probeApi } from "../lib/health.ts";
import { StackUnavailableError } from "../lib/errors.ts";
import { config } from "dotenv";

config({ path: "../.env" });

export async function withApiEnv(
  name: string,
  fn: (ctx: {
    api: any;
    token: string;
    cleanup: (fn: () => Promise<void>) => void;
  }) => Promise<void>,
) {
  const port = process.env.PORT || process.env.API_PORT || "3000";
  const baseUrl = `http://localhost:${port}/graphql`;
  const rootUrl = `http://localhost:${port}`;

  if (!(await probeApi(rootUrl))) {
    throw new StackUnavailableError("Rust Engine", rootUrl);
  }

  const api = createEngineClient({ baseUrl });
  const token = await getToken(api);
  api.setToken(token);

  const { register, run } = withCleanup();

  console.log(`\n--- Running API Test: ${name} ---`);
  try {
    await fn({ api, token, cleanup: register });
  } finally {
    await run();
  }
}
