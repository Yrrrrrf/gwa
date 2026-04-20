import { createSurrealClient } from "../lib/clients/surreal.ts";
import { createEngineClient } from "../lib/clients/engine.ts";
import { createRpcClient } from "../lib/clients/rpc.ts";
import { getToken, withCleanup } from "../lib/fixtures.ts";
import { mintToken } from "../lib/tokens.ts";
import { probeApi, probeRpc, probeSurreal } from "../lib/health.ts";
import { StackUnavailableError } from "../lib/errors.ts";
import { config } from "dotenv";

config({ path: "../.env" });

export async function withE2eEnv(
  name: string,
  fn: (ctx: {
    surreal: any;
    api: any;
    rpc: any;
    apiToken: string;
    rpcToken: string;
    cleanup: (fn: () => Promise<void>) => void;
  }) => Promise<void>,
) {
  const dbUser = process.env.SURREAL_USER || "root";
  const dbPass = process.env.SURREAL_PASS || "root";
  const dbPort = process.env.SURREAL_PORT || "8000";
  const dbBaseUrl = `http://localhost:${dbPort}`;

  const apiPort = process.env.PORT || process.env.API_PORT || "3000";
  const apiBaseUrl = `http://localhost:${apiPort}/graphql`;
  const apiRootUrl = `http://localhost:${apiPort}`;

  const rpcPort = process.env.PORT_RPC || "4000";
  const rpcBaseUrl = `http://localhost:${rpcPort}`;

  if (!(await probeSurreal(dbBaseUrl))) {
    throw new StackUnavailableError("SurrealDB", dbBaseUrl);
  }
  if (!(await probeApi(apiRootUrl))) {
    throw new StackUnavailableError("Rust Engine", apiRootUrl);
  }
  if (!(await probeRpc(rpcBaseUrl))) {
    throw new StackUnavailableError("Go RPC", rpcBaseUrl);
  }

  const surreal = createSurrealClient({
    baseUrl: dbBaseUrl,
    user: dbUser,
    pass: dbPass,
  });

  const api = createEngineClient({ baseUrl: apiBaseUrl });
  const apiToken = await getToken(api);
  api.setToken(apiToken);

  const rpcToken = await mintToken();
  const rpc = createRpcClient({ baseUrl: rpcBaseUrl, token: rpcToken });

  const { register, run } = withCleanup();
  register(async () => {
    await surreal.close();
  });

  console.log(`\n--- Running E2E Test: ${name} ---`);
  try {
    await fn({ surreal, api, rpc, apiToken, rpcToken, cleanup: register });
  } finally {
    await run();
  }
}
