import { assert, equal } from "../../helpers/assert.ts";
import { contract, invoke, notify } from "../../helpers/client.ts";
Deno.test("worker exposes success and failure through canonical contracts", async () => {
  for (const payload of [notify(), { ...notify(), recipient: "" }]) {
    const queued = contract(
      "system.EnqueueResult",
      await invoke(
        "system.enqueue",
        contract("system.EnqueueRequest", {
          operation: "notify.send",
          payload_json: JSON.stringify(payload),
        }),
      ),
    );
    let job: Record<string, unknown> = {};
    for (let i = 0; i < 60; i++) {
      job = contract(
        "system.JobResult",
        await invoke("system.job", contract("system.JobRequest", { job_id: queued.job_id })),
      );
      if (job.state === "succeeded" || job.state === "failed") break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    if (payload.recipient) {
      equal(job.state, "succeeded");
      contract("notify.SendResult", JSON.parse(job.result_json as string));
    } else {
      equal(job.state, "failed");
      assert(String(job.error).length > 0);
    }
  }
});
