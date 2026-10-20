import protobuf from "protobufjs";
import { assert, equal } from "../../helpers/assert.ts";

Deno.test("canonical capability contracts and generic gRPC envelope load together", async () => {
  const base = new URL("../../../config/contracts/", import.meta.url);
  const schema = await new protobuf.Root().load([
    new URL("notify/notify.proto", base).pathname,
    new URL("report/report.proto", base).pathname,
    new URL("system/system.proto", base).pathname,
  ]);
  const invoke = schema.lookupType("gwa.system.InvokeRequest");
  const send = schema.lookupType("gwa.notify.SendRequest");
  const generate = schema.lookupType("gwa.report.GenerateRequest");
  equal(
    send.verify({
      recipient: "test@example.test",
      subject: "subject",
      body: "body",
    }),
    null,
  );
  equal(
    generate.verify({ title: "title", content: "content", format: "html" }),
    null,
  );
  assert(invoke.fields.operation);
  assert(invoke.fields.payloadJson ?? invoke.fields.payload_json);
  assert(schema.lookupService("gwa.system.Capabilities").methods.Invoke);
});
