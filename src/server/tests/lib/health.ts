import { spawnSync } from "node:child_process";

export async function probeSurreal(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.body) await res.body.cancel();
    return res.status === 200;
  } catch (_err) {
    return false;
  }
}

export async function probeApi(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    if (res.body) await res.body.cancel();
    return res.status === 200 || res.status === 404;
  } catch (_err) {
    return false;
  }
}

export function probeRpc(url: string): Promise<boolean> {
  try {
    const addr = url.replace(/^https?:\/\//, "");

    // Always use nix-shell for reliability since we know it works
    const res = spawnSync("nix", [
      "shell",
      "nixpkgs#grpcurl",
      "--command",
      "grpcurl",
      "-plaintext",
      addr,
      "grpc.health.v1.Health/Check",
    ]);

    return Promise.resolve(res.status === 0);
  } catch (_err) {
    return Promise.resolve(false);
  }
}
