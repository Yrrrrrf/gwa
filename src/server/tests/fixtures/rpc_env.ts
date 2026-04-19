import { createRpcClient } from "../lib/clients/rpc.ts";
import { createEngineClient } from "../lib/clients/engine.ts";
import { getToken, withCleanup } from "../lib/fixtures.ts";
import { probeRpc } from "../lib/health.ts";
import { StackUnavailableError } from "../lib/errors.ts";
import { config } from "dotenv";

config({ path: "../.env" });

export async function withRpcEnv(
  name: string,
  fn: (
    ctx: { rpc: any; cleanup: (fn: () => Promise<void>) => void },
  ) => Promise<void>,
) {
  const port = process.env.PORT_RPC || "4000";
  const baseUrl = `http://localhost:${port}`;

  if (!await probeRpc(baseUrl)) {
    throw new StackUnavailableError("Go RPC", baseUrl);
  }

  // Get token from engine for RPC auth
  const apiPort = process.env.PORT || process.env.API_PORT || "3000";
  const api = createEngineClient({ baseUrl: `http://localhost:${apiPort}/graphql` });
  const token = await getToken(api);

  const rpc = createRpcClient({ baseUrl, token });
  const { register, run } = withCleanup();

  console.log(`\n--- Running RPC Test: ${name} ---`);
  try {
    await fn({ rpc, cleanup: register });
  } finally {
    await run();
  }
}
