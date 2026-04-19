import { ClientConfig } from "./client.ts";

export async function probeSurreal(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
    await res.body?.cancel();
    return res.status === 200;
  } catch (_err) {
    return false;
  }
}

export async function probeApi(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    await res.body?.cancel();
    return res.status === 200 || res.status === 404;
  } catch (_err) {
    return false;
  }
}

export async function probeRpc(url: string): Promise<boolean> {
  try {
    // baseUrl is http://localhost:4000
    const addr = url.replace(/^https?:\/\//, "");
    const command = new Deno.Command("grpcurl", {
      args: ["-plaintext", addr, "grpc.health.v1.Health/Check"],
    });
    const { code } = await command.output();
    return code === 0;
  } catch (_err) {
    return false;
  }
}

export async function checkStackHealth(config: ClientConfig) {
  const surrealUp = await probeSurreal(config.baseUrl);
  const engineUp = await probeApi(config.baseUrl.replace(":8000", ":3000") + "/graphql");
  const rpcUp = await probeRpc(config.baseUrl.replace(":8000", ":4000"));

  return {
    surreal: surrealUp,
    engine: engineUp,
    rpc: rpcUp
  };
}
