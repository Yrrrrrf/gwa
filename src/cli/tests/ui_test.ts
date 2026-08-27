// tests/ui_test.ts — Visual layout, Cliffy Table and formatting tests
import { assertEquals, assertGreater } from "@std/assert";
import {
  badge,
  buildTableLines,
  chevron,
  formatDuration,
  metric,
} from "../src/ui.ts";
import type { TaskState } from "../src/types.ts";

Deno.test("chevron returns styled string", () => {
  assertEquals(chevron().includes("❯❯"), true);
});

Deno.test("metric formats counts with colors", () => {
  assertEquals(metric(5, "passed", "green").includes("5 passed"), true);
  assertEquals(metric(0, "failed", "red_bold").includes("0 failed"), true);
});

Deno.test("badge formats 3-part metrics", () => {
  const b = badge(10, "files", 0, "errors", 2, "warnings");
  assertEquals(b.includes("10 files"), true);
  assertEquals(b.includes("0 errors"), true);
  assertEquals(b.includes("2 warnings"), true);
});

Deno.test("formatDuration formats ms and seconds", () => {
  assertEquals(formatDuration(450), "450ms");
  assertEquals(formatDuration(1500), "1.50s");
  assertEquals(formatDuration(2345), "2.35s");
});

Deno.test("buildTableLines formats categorized tasks using Cliffy Table", () => {
  const tasks: TaskState<{ name: string; path?: string }>[] = [
    {
      cat: "SDK",
      target: { name: "core" },
      plan: { engine: "deno", cmd: ["echo", "1"] },
      status: "done",
      badge: "(6 files, 0 errors, 0 warnings)",
      durationStr: "72ms",
      isErr: false,
      output: "",
    },
    {
      cat: "SDK",
      target: { name: "ui" },
      plan: { engine: "svelte-check", cmd: ["echo", "2"] },
      status: "running",
      badge: "",
      durationStr: "",
      isErr: false,
      output: "",
      startMs: Date.now() - 500,
    },
    {
      cat: "APP",
      target: { name: "vision" },
      plan: { engine: "svelte-check", cmd: ["echo", "3"] },
      status: "pending",
      badge: "",
      durationStr: "",
      isErr: false,
      output: "",
    },
  ];

  const lines = buildTableLines(tasks, "⠙", true);
  assertGreater(lines.length, 3);
  assertEquals(lines.some((l) => l.includes("[SDK]")), true);
  assertEquals(lines.some((l) => l.includes("[APP]")), true);
  assertEquals(lines.some((l) => l.includes("core")), true);
  assertEquals(lines.some((l) => l.includes("vision")), true);
});
