import { assert, equal, rejects } from "../../../helpers/assert.ts";
import { base, contract, invoke, report, token } from "../../../helpers/client.ts";
Deno.test("report text and escaped HTML have actual MIME and byte counts", async () => {
  for (const format of ["text", "html"]) {
    const result = contract(
      "report.GenerateResult",
      await invoke("report.generate", report(format)),
    );
    const response = await fetch(`${base()}/artifacts/${result.artifact_id}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    equal(response.status, 200);
    equal(response.headers.get("content-type"), result.content_type);
    const text = await response.text();
    equal(new TextEncoder().encode(text).length, result.bytes);
    if (format === "html") {
      assert(text.includes("&lt;script&gt;"));
      assert(!text.includes("<script>"));
    }
  }
  await rejects(() => invoke("report.generate", report("pdf")));
});
