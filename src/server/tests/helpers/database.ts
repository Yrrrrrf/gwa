import { assert } from "./assert.ts";
export async function sql(
  query: string,
  database = Deno.env.get("GWA_DB_NAME")!,
  environment: Record<string, string> = Deno.env.toObject(),
) {
  const response = await fetch(`${environment.GWA_DB_URL}/sql`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${environment.GWA_DB_USER}:${environment.GWA_DB_PASSWORD}`)}`,
      Accept: "application/json",
      "Content-Type": "text/plain",
      "surreal-ns": environment.GWA_DB_NS,
      "surreal-db": database,
    },
    body: query,
    signal: AbortSignal.timeout(5000),
  });
  const result = await response.json();
  assert(
    response.ok && result.every((row: { status: string }) => row.status === "OK"),
    JSON.stringify(result),
  );
  return result;
}
