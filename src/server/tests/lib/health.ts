export async function probeSurreal(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function probeApi(url: string): Promise<boolean> {
  try {
    // Rust engine might not have /health yet, so we try root or /healthz
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.status === 200 || res.status === 404; // 404 is still reachable
  } catch {
    return false;
  }
}

export async function probeRpc(url: string): Promise<boolean> {
  try {
    // url is http://localhost:4000
    const port = parseInt(new URL(url).port);
    const conn = await Deno.connect({ port, hostname: "localhost" });
    conn.close();
    return true;
  } catch {
    return false;
  }
}
