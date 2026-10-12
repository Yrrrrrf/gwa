import { up } from "up-fetch";
import protobuf from "protobufjs";
const contractRoot = new URL("../../config/contracts/", import.meta.url);
const paths: string[] = [];
for (const dir of Deno.readDirSync(contractRoot)) {
  if (dir.isDirectory) {
    for (const file of Deno.readDirSync(new URL(`${dir.name}/`, contractRoot))) {
      if (file.name.endsWith(".proto")) {
        paths.push(new URL(`${dir.name}/${file.name}`, contractRoot).pathname);
      }
    }
  }
}
export const schema = await new protobuf.Root().load(paths.sort(), { keepCase: true });
export function contract(name: string, value: unknown): Record<string, unknown> {
  const type = schema.lookupType(`gwa.${name}`);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("message required");
  }
  const record = value as Record<string, unknown>;
  for (const field of Object.keys(record)) {
    if (!type.fields[field]) throw new Error(`unknown field ${field}`);
  }
  for (const field of type.fieldsArray) {
    if (!(field.name in record)) throw new Error(`missing field ${field.name}`);
  }
  const error = type.verify(record);
  if (error) throw new Error(error);
  return record;
}
export const token = () => Deno.env.get("GWA_API_TOKEN") ?? "";
export const base = () => Deno.env.get("GWA_HTTP_URL") ?? "";
export const api = up(
  fetch,
  () => ({
    baseUrl: base(),
    timeout: 5000,
    retry: { attempts: 0 },
    headers: { Authorization: `Bearer ${token()}` },
  }),
);
export async function invoke(operation: string, payload: Record<string, unknown>) {
  return await api<Record<string, unknown>>(`/api/${operation.replace(".", "/")}`, {
    method: "POST",
    body: payload,
  });
}
export const notify = () =>
  contract("notify.SendRequest", {
    recipient: "consumer@example.test",
    subject: "Contract test",
    body: "Hello",
  });
export const report = (format = "text") =>
  contract("report.GenerateRequest", {
    title: "Consumer <title>",
    content: "Content & <script>",
    format,
  });
