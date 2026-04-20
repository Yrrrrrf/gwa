import { probeApi, probeRpc, probeSurreal } from "./health.ts";

export async function checkAll(urls: {
  surreal: string;
  engine: string;
  rpc: string;
}) {
  const [surreal, engine, rpc] = await Promise.all([
    probeSurreal(urls.surreal),
    probeApi(urls.engine),
    probeRpc(urls.rpc),
  ]);

  return { surreal, engine, rpc, all: surreal && engine && rpc };
}

export { probeApi, probeRpc, probeSurreal };
