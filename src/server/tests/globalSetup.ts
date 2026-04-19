import { config } from "dotenv";
import { probeApi, probeRpc, probeSurreal } from "./lib/health.ts";

export default async function () {
  config({ path: "../.env" });

  const dbUrl = `http://localhost:${process.env.SURREAL_PORT || "8000"}`;
  const apiUrl = `http://localhost:${process.env.PORT || "3000"}`;
  const rpcUrl = `http://localhost:${process.env.PORT_RPC || "4000"}`;

  console.log("\n── Pre-flight Check ─────────────────────────────────────");

  const dbUp = await probeSurreal(dbUrl);
  console.log(`🗄️  SurrealDB: ${dbUp ? "✅ UP" : "❌ DOWN"} (${dbUrl})`);

  const apiUp = await probeApi(apiUrl);
  console.log(`🦀 Engine:    ${apiUp ? "✅ UP" : "❌ DOWN"} (${apiUrl})`);

  const rpcUp = await probeRpc(rpcUrl);
  console.log(`🐹 RPC:       ${rpcUp ? "✅ UP" : "❌ DOWN"} (${rpcUrl})`);

  console.log("────────────────────────────────────────────────────────");

  if (!dbUp || !apiUp || !rpcUp) {
    console.error(
      "\n❌ Some services are unreachable. Run 'just run' first.",
    );
    process.exit(1);
  }

  console.log("\n🚀 All services ready. Starting tests...\n");
}
