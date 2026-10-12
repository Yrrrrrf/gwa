import { assert, equal, rejects } from "../../../helpers/assert.ts";
import { api, base, contract, invoke, notify, report, token } from "../../../helpers/client.ts";
Deno.test("HTTP registry dispatch, faults, body limit and artifact access", async () => {
  const list = await api<{ operations: string[] }>("/api");
  assert(list.operations.includes("notify.send"));
  assert(list.operations.includes("system.enqueue"));
  contract("notify.SendResult", await invoke("notify.send", notify()));
  const result = contract("report.GenerateResult", await invoke("report.generate", report()));
  const response = await fetch(`${base()}/artifacts/${result.artifact_id}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  equal(response.status, 200);
  assert(response.headers.get("content-disposition")?.includes("attachment"));
  equal(response.headers.get("x-content-type-options"), "nosniff");
  const body = await response.text();
  equal(new TextEncoder().encode(body).length, result.bytes);
  const denied = await fetch(`${base()}/artifacts/${result.artifact_id}`);
  equal(denied.status, 401);
  await denied.body?.cancel();
  await rejects(() => invoke("notify.send", { ...notify(), extra: true }));
  await rejects(() => invoke("missing.operation", {}));
  const malformed = await fetch(`${base()}/api/notify/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}` },
    body: "{",
  });
  equal(malformed.status, 400);
  equal((await malformed.json()).code, "invalid");
  const large = await fetch(`${base()}/api/notify/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}` },
    body: "x".repeat(100_000),
  });
  equal(large.status, 413);
  await large.body?.cancel();
  const invalid = await fetch(`${base()}/artifacts/unsafe.txt`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  equal(invalid.status, 400);
  await invalid.body?.cancel();
});
