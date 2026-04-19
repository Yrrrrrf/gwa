import { createRpcClient } from "../lib/client.ts";
import { withCleanup } from "../lib/fixtures.ts";
import { load } from "@std/dotenv";

export async function withRpcEnv(
  name: string, 
  fn: (ctx: { rpc: any; cleanup: (fn: () => Promise<void>) => void }) => Promise<void>
) {
  await load({ export: true, envPath: "../.env" });

  const port = Deno.env.get("RPC_PORT") || "4000";
  const baseUrl = `http://localhost:${port}`;

  const rpc = createRpcClient({ baseUrl });
  const { register, run } = withCleanup();

  console.log(`\n--- Running RPC Test: ${name} ---`);
  try {
    await fn({ rpc, cleanup: register });
  } finally {
    await run();
  }
}
