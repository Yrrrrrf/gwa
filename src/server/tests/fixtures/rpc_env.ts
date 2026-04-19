import { createRpcClient } from "../lib/client.ts";
import { withCleanup } from "../lib/fixtures.ts";
import { probeRpc } from "../lib/health.ts";
import { StackUnavailableError } from "../lib/errors.ts";
import { printSummary, resetCounts } from "../lib/assert.ts";
import { load } from "@std/dotenv";

export async function withRpcEnv(
  name: string,
  fn: (
    ctx: { rpc: any; cleanup: (fn: () => Promise<void>) => void },
  ) => Promise<void>,
) {
  await load({ export: true, envPath: "../.env" });

  const port = Deno.env.get("PORT_RPC") || "4000";
  const baseUrl = `http://localhost:${port}`;

  if (!await probeRpc(baseUrl)) {
    throw new StackUnavailableError("Go RPC", baseUrl);
  }

  const rpc = createRpcClient({ baseUrl });
  const { register, run } = withCleanup();

  resetCounts();
  console.log(`\n--- Running RPC Test: ${name} ---`);
  try {
    await fn({ rpc, cleanup: register });
  } finally {
    printSummary();
    await run();
  }
}
