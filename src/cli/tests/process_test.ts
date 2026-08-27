// tests/process_test.ts — Process execution and RAM Web Streams tests
import { assertEquals, assertGreater, assertNotEquals } from "@std/assert";
import { spawnStreamingProcess } from "../src/process.ts";

Deno.test("spawnStreamingProcess captures stdout and stderr in RAM", async () => {
  const lines: string[] = [];
  const res = await spawnStreamingProcess({
    cmd: [
      Deno.execPath(),
      "eval",
      "console.log('hello from stdout'); console.error('hello from stderr');",
    ],
    onLine: (line) => lines.push(line),
  });

  assertEquals(res.exitCode, 0);
  assertEquals(res.stdout, "hello from stdout");
  assertEquals(res.stderr, "hello from stderr");
  assertEquals(lines.length, 2);
  assertGreater(res.elapsedMs, 0);
});

Deno.test("spawnStreamingProcess handles large pipe volume without deadlock", async () => {
  // Generate 2,000 lines (exceeds 64KB OS pipe buffer)
  const res = await spawnStreamingProcess({
    cmd: [
      Deno.execPath(),
      "eval",
      "for (let i = 0; i < 2000; i++) console.log('line ' + i);",
    ],
  });

  assertEquals(res.exitCode, 0);
  const outLines = res.stdout.split("\n");
  assertEquals(outLines.length, 2000);
});

Deno.test("spawnStreamingProcess aborts child process when signal fires", async () => {
  const ac = new AbortController();
  const promise = spawnStreamingProcess({
    cmd: [
      Deno.execPath(),
      "eval",
      "setTimeout(() => console.log('done'), 10000);",
    ],
    signal: ac.signal,
  });

  setTimeout(() => ac.abort(), 100);

  const res = await promise;
  // Non-zero exit code on abort/kill (e.g. 143 SIGTERM)
  assertNotEquals(res.exitCode, 0);
});
