// tests/runner_test.ts — End-to-end runner and concurrency scheduler tests
import { assertEquals, assertGreater } from "@std/assert";
import { runSuite } from "../src/runner.ts";
import type { BaseTarget, TargetCategory } from "../src/types.ts";

interface MockTarget extends BaseTarget {
  readonly shouldFail?: boolean;
}

const mockCategories: TargetCategory<MockTarget>[] = [
  {
    name: "SDK",
    targets: [
      { name: "core" },
      { name: "api" },
    ],
  },
  {
    name: "APP",
    targets: [
      { name: "vision" },
    ],
  },
];

Deno.test("runSuite executes tasks sequentially and returns success", async () => {
  const result = await runSuite({
    title: "TEST-SUITE",
    categories: mockCategories,
    resolver: (t) => ({
      engine: "mock",
      cmd: [Deno.execPath(), "eval", `console.log('ran ${t.name}');`],
      displayCmd: `mock run ${t.name}`,
    }),
    evaluator: (res, t) => ({
      badge: `(1 files, 0 errors, 0 warnings)`,
      isErr: res.exitCode !== 0,
      errCount: res.exitCode === 0 ? 0 : 1,
      data: { name: t.name },
    }),
    isVerbose: false,
    isParallel: false,
    successMsg: "✓ All mock targets passed",
    failMsg: (n) => `✗ ${n} targets failed`,
  });

  assertEquals(result.success, true);
  assertEquals(result.totalErrors, 0);
  assertEquals(result.results.length, 3);
  assertGreater(result.totalElapsedMs, 0);
});

Deno.test("runSuite executes tasks in parallel concurrently", async () => {
  const result = await runSuite({
    title: "PARALLEL-SUITE",
    categories: mockCategories,
    resolver: (t) => ({
      engine: "mock-parallel",
      cmd: [Deno.execPath(), "eval", `setTimeout(() => {}, 50);`],
      displayCmd: `mock-p run ${t.name}`,
    }),
    evaluator: (res) => ({
      badge: `(passed)`,
      isErr: res.exitCode !== 0,
      errCount: 0,
    }),
    isVerbose: false,
    isParallel: true,
    successMsg: "✓ Parallel suite complete",
    failMsg: (n) => `✗ ${n} targets failed`,
  });

  assertEquals(result.success, true);
  assertEquals(result.totalErrors, 0);
  assertEquals(result.results.length, 3);
});

Deno.test("runSuite captures task failures and accumulates error counts", async () => {
  const categoriesWithFailure: TargetCategory<MockTarget>[] = [
    {
      name: "SDK",
      targets: [
        { name: "ok-pkg" },
        { name: "fail-pkg", shouldFail: true },
      ],
    },
  ];

  const result = await runSuite({
    title: "FAILURE-SUITE",
    categories: categoriesWithFailure,
    resolver: (t) => ({
      engine: "mock",
      cmd: t.shouldFail
        ? [
          Deno.execPath(),
          "eval",
          `console.error('Fatal error occurred'); Deno.exit(1);`,
        ]
        : [Deno.execPath(), "eval", `console.log('All good');`],
    }),
    evaluator: (res) => ({
      badge: res.exitCode === 0 ? "(0 errors)" : "(1 error)",
      isErr: res.exitCode !== 0,
      errCount: res.exitCode === 0 ? 0 : 1,
    }),
    isVerbose: false,
    isParallel: false,
    successMsg: "✓ Success",
    failMsg: (n) => `✗ ${n} failed`,
  });

  assertEquals(result.success, false);
  assertEquals(result.totalErrors, 1);
  assertEquals(result.results[1].status, "failed");
  assertEquals(result.results[1].output.includes("Fatal error occurred"), true);
});

Deno.test("runSuite aborts early on failFast", async () => {
  const categories: TargetCategory<MockTarget>[] = [
    {
      name: "TASKS",
      targets: [
        { name: "failing-1", shouldFail: true },
        { name: "task-2" },
      ],
    },
  ];

  const result = await runSuite({
    title: "FAILFAST-SUITE",
    categories,
    failFast: true,
    resolver: (t) => ({
      engine: "mock",
      cmd: t.shouldFail
        ? [Deno.execPath(), "eval", `Deno.exit(1);`]
        : [Deno.execPath(), "eval", `console.log('ran 2');`],
    }),
    evaluator: (res) => ({
      badge: res.exitCode === 0 ? "(ok)" : "(fail)",
      isErr: res.exitCode !== 0,
      errCount: res.exitCode === 0 ? 0 : 1,
    }),
    isVerbose: false,
    isParallel: false,
    successMsg: "✓ Success",
    failMsg: (n) => `✗ ${n} failed`,
  });

  assertEquals(result.success, false);
  // Second task should not be "done" because failFast stopped the loop
  const secondTask = result.results.find((r) => r.target.name === "task-2");
  assertEquals(secondTask?.status, "pending");
});
