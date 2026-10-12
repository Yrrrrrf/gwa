import { assert, equal } from "../../../helpers/assert.ts";
import { base, contract, notify, token } from "../../../helpers/client.ts";
async function rpc(body: unknown) {
  const response = await fetch(`${base()}/rpc`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, value: response.status === 204 ? null : await response.json() };
}
Deno.test("JSON-RPC replies, explicit null id, notifications, batch and errors", async () => {
  const reply = await rpc({ jsonrpc: "2.0", method: "notify.send", params: notify(), id: null });
  equal(reply.value.id, null);
  contract("notify.SendResult", reply.value.result);
  equal((await rpc({ jsonrpc: "2.0", method: "notify.send", params: notify() })).status, 204);
  const batch = await rpc([{ jsonrpc: "2.0", method: "notify.send", params: notify() }, {
    jsonrpc: "2.0",
    method: "missing.operation",
    id: 2,
  }]);
  equal(batch.value.length, 1);
  equal(batch.value[0].error.code, -32601);
  equal((await rpc([])).value.error.code, -32600);
  const invalid = await rpc({ jsonrpc: "2.0", method: "notify.send", params: {}, id: "bad" });
  equal(invalid.value.id, "bad");
  equal(invalid.value.error.code, -32602);
  const parse = await fetch(`${base()}/rpc`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}` },
    body: "{",
  });
  const error = await parse.json();
  assert(error.error.code === -32700);
});
