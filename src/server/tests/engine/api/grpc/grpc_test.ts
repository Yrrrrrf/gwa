import * as grpc from "@grpc/grpc-js";
import * as loader from "@grpc/proto-loader";
import { assert, equal } from "../../../helpers/assert.ts";
import { contract, notify, report, token } from "../../../helpers/client.ts";
const definition = loader.loadSync(
  new URL("../../../../config/contracts/system/system.proto", import.meta.url).pathname,
  { keepCase: true, defaults: true },
);
const method = (definition["gwa.system.Capabilities"] as grpc.ServiceDefinition).Invoke;
function invoke(
  client: grpc.Client,
  operation: string,
  payload: unknown,
  authenticated = true,
): Promise<Record<string, unknown>> {
  const metadata = new grpc.Metadata();
  if (authenticated) metadata.set("authorization", `Bearer ${token()}`);
  const request = contract("system.InvokeRequest", {
    operation,
    payload_json: JSON.stringify(payload),
  });
  return new Promise((resolve, reject) =>
    client.makeUnaryRequest(
      method.path,
      method.requestSerialize,
      method.responseDeserialize,
      request,
      metadata,
      { deadline: Date.now() + 5000 },
      (error, response) =>
        error ? reject(error) : resolve(contract("system.InvokeResult", response)),
    )
  );
}
Deno.test("gRPC canonical envelope and status mapping", async () => {
  const client = new grpc.Client(Deno.env.get("GWA_GRPC_ADDR")!, grpc.credentials.createInsecure());
  try {
    const result = await invoke(client, "notify.send", notify());
    contract("notify.SendResult", JSON.parse(result.result_json as string));
    const artifact = await invoke(client, "report.generate", report());
    contract("report.GenerateResult", JSON.parse(artifact.result_json as string));
    for (
      const [operation, payload, auth, code] of [["notify.send", notify(), false, 16], [
        "missing.operation",
        {},
        true,
        5,
      ], ["notify.send", {}, true, 3]] as const
    ) {
      let status = -1;
      try {
        await invoke(client, operation, payload, auth);
      } catch (error) {
        status = (error as grpc.ServiceError).code;
      }
      equal(status, code);
    }
    assert(method.path === "/gwa.system.Capabilities/Invoke");
  } finally {
    client.close();
  }
});
