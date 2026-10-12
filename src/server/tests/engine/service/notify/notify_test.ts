import { assert, rejects } from "../../../helpers/assert.ts";
import { contract, invoke, notify } from "../../../helpers/client.ts";
Deno.test("notify returns distinct real file receipts and validates inputs", async () => {
  const first = contract("notify.SendResult", await invoke("notify.send", notify()));
  const second = contract("notify.SendResult", await invoke("notify.send", notify()));
  assert(first.receipt !== second.receipt);
  assert(first.provider === "file");
  await rejects(() => invoke("notify.send", { ...notify(), recipient: "" }));
});
