import { probeSurreal, probeApi, probeRpc } from "./lib/health.ts";
import { load } from "@std/dotenv";

async function main() {
  await load({ export: true, envPath: "../.env" });

  const dbUrl = `http://localhost:${Deno.env.get("SURREAL_PORT") || "8000"}`;
  const apiUrl = `http://localhost:${Deno.env.get("PORT") || "3000"}`;
  const rpcUrl = `http://localhost:${Deno.env.get("PORT_RPC") || "4000"}`;

  console.log("── Pre-flight Check ─────────────────────────────────────");
  
  const dbUp = await probeSurreal(dbUrl);
  console.log(`🗄️  SurrealDB: ${dbUp ? "✅ UP" : "❌ DOWN"} (${dbUrl})`);

  const apiUp = await probeApi(apiUrl);
  console.log(`🦀 Engine:    ${apiUp ? "✅ UP" : "❌ DOWN"} (${apiUrl})`);

  const rpcUp = await probeRpc(rpcUrl);
  console.log(`🐹 RPC:       ${rpcUp ? "✅ UP" : "❌ DOWN"} (${rpcUrl})`);

  console.log("────────────────────────────────────────────────────────");

  if (!dbUp || !apiUp || !rpcUp) {
    console.error("\n❌ Some services are unreachable. Run 'just server run' first.");
    Deno.exit(1);
  }

  console.log("\n🚀 All services ready. Starting tests...\n");
}

if (import.meta.main) {
  main();
}
