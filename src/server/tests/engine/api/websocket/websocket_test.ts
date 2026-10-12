import { assert, equal } from "../../../helpers/assert.ts";
import { base, contract, notify, report, token } from "../../../helpers/client.ts";
function session() {
  const socket = new WebSocket(`${base().replace(/^http/, "ws")}/ws`);
  const values: string[] = [];
  const readers: ((value: string) => void)[] = [];
  socket.addEventListener("message", (event) => {
    const reader = readers.shift();
    if (reader) reader(String(event.data));
    else values.push(String(event.data));
  });
  const opened = new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("WS connect failed")), { once: true });
  });
  const closed = new Promise<CloseEvent>((resolve) =>
    socket.addEventListener("close", resolve, { once: true })
  );
  return {
    socket,
    opened,
    closed,
    next: () =>
      new Promise<string>((resolve, reject) => {
        const value = values.shift();
        if (value !== undefined) {
          resolve(value);
          return;
        }
        const timer = setTimeout(() => reject(new Error("WS timeout")), 5000);
        readers.push((value) => {
          clearTimeout(timer);
          resolve(value);
        });
      }),
  };
}
Deno.test("WebSocket first-frame auth, shared RPC and rejected auth", async () => {
  const s = session();
  await s.opened;
  s.socket.send(JSON.stringify({ auth: token() }));
  equal(JSON.parse(await s.next()).authenticated, true);
  for (
    const [name, payload, result] of [["notify.send", notify(), "notify.SendResult"], [
      "report.generate",
      report(),
      "report.GenerateResult",
    ]] as const
  ) {
    s.socket.send(JSON.stringify({ jsonrpc: "2.0", id: name, method: name, params: payload }));
    const reply = JSON.parse(await s.next());
    equal(reply.id, name);
    contract(result, reply.result);
  }
  s.socket.send(JSON.stringify({ jsonrpc: "2.0", id: 3, method: "unknown.operation" }));
  equal(JSON.parse(await s.next()).error.code, -32601);
  s.socket.send("{");
  equal(JSON.parse(await s.next()).error.code, -32700);
  s.socket.close();
  await s.closed;
  const wrong = session();
  await wrong.opened;
  wrong.socket.send(JSON.stringify({ auth: "wrong" }));
  assert((await wrong.closed).code === 1008);
});

Deno.test("WebSocket binary messages are rejected after authentication", async () => {
  const s = session();
  await s.opened;
  s.socket.send(JSON.stringify({ auth: token() }));
  await s.next();
  s.socket.send(new Uint8Array([1, 2, 3]));
  equal((await s.closed).code, 1003);
});
