// src/cli.ts — Master CLI entrypoint for @gwa/cli-engine
// Self-testing dogfooding harness showcasing the generic engine recursively

import { Command } from "@cliffy/command";
import { HelpCommand } from "@cliffy/command/help";
import { CompletionsCommand } from "@cliffy/command/completions";
import { stripAnsiCode } from "@std/fmt/colors";
import { runSuite } from "./runner.ts";
import { badge } from "./ui.ts";
import type { BaseTarget, ProcessResult, TargetCategory } from "./types.ts";

interface CliTarget extends BaseTarget {
  readonly path: string;
}

interface GlobalOptions {
  readonly verbose?: boolean;
  readonly parallel?: boolean;
  readonly bench?: boolean;
  readonly failFast?: boolean;
  readonly filter?: string;
  readonly check?: boolean;
}

const typeCategories: TargetCategory<CliTarget>[] = [
  {
    name: "CORE",
    targets: [
      { name: "mod", path: "src/mod.ts" },
      { name: "types", path: "src/types.ts" },
      { name: "terminal", path: "src/terminal.ts" },
      { name: "process", path: "src/process.ts" },
      { name: "ui", path: "src/ui.ts" },
      { name: "runner", path: "src/runner.ts" },
      { name: "cli", path: "src/cli.ts" },
    ],
  },
  {
    name: "TESTS",
    targets: [
      { name: "process_test", path: "tests/process_test.ts" },
      { name: "terminal_test", path: "tests/terminal_test.ts" },
      { name: "ui_test", path: "tests/ui_test.ts" },
      { name: "runner_test", path: "tests/runner_test.ts" },
    ],
  },
];

const testCategories: TargetCategory<CliTarget>[] = [
  {
    name: "SUITES",
    targets: [
      { name: "process", path: "tests/process_test.ts" },
      { name: "terminal", path: "tests/terminal_test.ts" },
      { name: "ui", path: "tests/ui_test.ts" },
      { name: "runner", path: "tests/runner_test.ts" },
    ],
  },
];

function parseDenoCheck(text: string, exitCode: number) {
  const matches = text.match(/TS\d+\s+\[ERROR\]/g);
  const count = matches ? matches.length : 0;
  const isErr = exitCode !== 0 || count > 0;
  return {
    isErr,
    errCount: isErr ? Math.max(count, 1) : 0,
  };
}

function parseTestStats(output: string, exitCode: number) {
  const clean = stripAnsiCode(output);
  const lines = clean.split("\n");
  const summaryLines = lines.filter(
    (l) => /ok\s+\|/i.test(l) || /FAILED\s+\|/i.test(l) || /passed/i.test(l),
  );
  const summary = summaryLines[summaryLines.length - 1] ?? clean;

  const pMatch = summary.match(/(\d+)\s+passed/);
  const fMatch = summary.match(/(\d+)\s+failed/);
  const sMatch = summary.match(/(\d+)\s+skipped/);

  const passed = pMatch ? parseInt(pMatch[1], 10) : 0;
  let failed = fMatch ? parseInt(fMatch[1], 10) : 0;
  const skipped = sMatch ? parseInt(sMatch[1], 10) : 0;
  if (exitCode !== 0 && failed === 0) failed = 1;

  return { passed, failed, skipped, isErr: exitCode !== 0 || failed > 0 };
}

// ── CLI Command Scaffold ───────────────────────────────────────────────

const cli = new Command()
  .name("gwa-cli")
  .version("0.0.1")
  .description("Self-testing harness and CLI engine for GWA")
  .default("help")
  .globalOption("-v, --verbose", "Show verbose process logs above dashboard")
  .globalOption("-p, --parallel", "Execute tasks concurrently across targets")
  .globalOption("-b, --bench", "Display task duration benchmarks")
  .globalOption(
    "--fail-fast",
    "Abort suite execution immediately on first error",
  )
  .globalOption("-f, --filter <pattern:string>", "Filter targets by name")
  .command("help", new HelpCommand().global())
  .command("completions", new CompletionsCommand())
  // ── TYPES COMMAND ──────────────────────────────────────────────────
  .command("types", "Type-check all engine and test modules")
  .action(async (options: GlobalOptions) => {
    const result = await runSuite({
      title: "TYPES",
      categories: typeCategories,
      cmdPreview: "deno check <src/*.ts> <tests/*.ts>",
      isVerbose: Boolean(options.verbose),
      isParallel: Boolean(options.parallel),
      isBench: Boolean(options.bench),
      failFast: Boolean(options.failFast),
      filter: options.filter,
      resolver: (target) => ({
        engine: "deno",
        cmd: ["deno", "check", target.path],
        displayCmd: `deno check ${target.path}`,
      }),
      evaluator: (res: ProcessResult) => {
        const stats = parseDenoCheck(res.combined, res.exitCode);
        return {
          badge: badge(1, "files", stats.errCount, "errors", 0, "warnings"),
          isErr: stats.isErr,
          errCount: stats.errCount,
        };
      },
      successMsg: "✓ 0 type errors across all modules",
      failMsg: (errs) => `✗ ${errs} type checking errors found`,
    });

    if (!result.success) {
      Deno.exit(1);
    }
  })
  // ── TEST COMMAND ───────────────────────────────────────────────────
  .command("test", "Run test suites across the CLI engine")
  .action(async (options: GlobalOptions) => {
    const result = await runSuite({
      title: "TEST",
      categories: testCategories,
      cmdPreview: "deno test -A <tests/*_test.ts>",
      isVerbose: Boolean(options.verbose),
      isParallel: Boolean(options.parallel),
      isBench: Boolean(options.bench),
      failFast: Boolean(options.failFast),
      filter: options.filter,
      resolver: (target) => ({
        engine: "deno",
        cmd: ["deno", "test", "-A", target.path],
        displayCmd: `deno test -A ${target.path}`,
      }),
      evaluator: (res: ProcessResult) => {
        const stats = parseTestStats(res.combined, res.exitCode);
        return {
          badge: badge(
            stats.passed,
            "passed",
            stats.failed,
            "failed",
            stats.skipped,
            "skipped",
          ),
          isErr: stats.isErr,
          errCount: stats.failed,
        };
      },
      successMsg: "✓ All test suites passed cleanly",
      failMsg: (errs) => `✗ ${errs} test suites failed`,
    });

    if (!result.success) {
      Deno.exit(1);
    }
  })
  // ── FMT COMMAND ────────────────────────────────────────────────────
  .command("fmt", "Format source code")
  .option("--check", "Run in check mode without writing")
  .action(async (options: GlobalOptions) => {
    const args = ["fmt"];
    if (options.check) args.push("--check");
    const cmd = new Deno.Command("deno", {
      args,
      stdout: "inherit",
      stderr: "inherit",
    });
    const status = await cmd.spawn().status;
    if (!status.success) Deno.exit(status.code);
  })
  // ── LINT COMMAND ───────────────────────────────────────────────────
  .command("lint", "Lint source code")
  .action(async () => {
    const cmd = new Deno.Command("deno", {
      args: ["lint"],
      stdout: "inherit",
      stderr: "inherit",
    });
    const status = await cmd.spawn().status;
    if (!status.success) Deno.exit(status.code);
  })
  // ── CHECK COMMAND ──────────────────────────────────────────────────
  .command("check", "Run fmt, lint, and types quality gates")
  .action(async (options: GlobalOptions) => {
    console.log("🔍 Checking formatting and linting...");
    const fmtCmd = new Deno.Command("deno", {
      args: ["fmt", "--check"],
      stdout: "inherit",
      stderr: "inherit",
    });
    const fmtStatus = await fmtCmd.spawn().status;
    if (!fmtStatus.success) Deno.exit(fmtStatus.code);

    const lintCmd = new Deno.Command("deno", {
      args: ["lint"],
      stdout: "inherit",
      stderr: "inherit",
    });
    const lintStatus = await lintCmd.spawn().status;
    if (!lintStatus.success) Deno.exit(lintStatus.code);

    // Run types
    const typesResult = await runSuite({
      title: "TYPES",
      categories: typeCategories,
      cmdPreview: "deno check <src/*.ts>",
      isVerbose: Boolean(options.verbose),
      isParallel: Boolean(options.parallel),
      isBench: Boolean(options.bench),
      failFast: Boolean(options.failFast),
      resolver: (target) => ({
        engine: "deno",
        cmd: ["deno", "check", target.path],
        displayCmd: `deno check ${target.path}`,
      }),
      evaluator: (res: ProcessResult) => {
        const stats = parseDenoCheck(res.combined, res.exitCode);
        return {
          badge: badge(1, "files", stats.errCount, "errors", 0, "warnings"),
          isErr: stats.isErr,
          errCount: stats.errCount,
        };
      },
      successMsg: "✓ 0 type errors across all modules",
      failMsg: (errs) => `✗ ${errs} type checking errors found`,
    });

    if (!typesResult.success) {
      Deno.exit(1);
    }
  })
  // ── BUILD COMMAND ──────────────────────────────────────────────────
  .command("build", "Build & verify CLI engine distribution")
  .action(async (options: GlobalOptions) => {
    const buildCategories: TargetCategory<CliTarget>[] = [
      {
        name: "DIST",
        targets: [
          { name: "mod.ts", path: "src/mod.ts" },
          { name: "cli.ts", path: "src/cli.ts" },
        ],
      },
    ];

    const result = await runSuite({
      title: "BUILD",
      categories: buildCategories,
      cmdPreview: "deno check <src/*.ts>",
      isVerbose: Boolean(options.verbose),
      isParallel: false,
      resolver: (target) => ({
        engine: "deno",
        cmd: ["deno", "check", target.path],
        displayCmd: `deno check ${target.path}`,
      }),
      evaluator: (res: ProcessResult) => {
        const stats = parseDenoCheck(res.combined, res.exitCode);
        return {
          badge: stats.isErr ? "(failed)" : "(verified)",
          isErr: stats.isErr,
          errCount: stats.errCount,
        };
      },
      successMsg: "✓ CLI engine distribution verified successfully",
      failMsg: (errs) => `✗ ${errs} verification checks failed`,
    });

    if (!result.success) {
      Deno.exit(1);
    }
  })
  // ── CI COMMAND ─────────────────────────────────────────────────────
  .command("ci", "Run full CI pipeline: check + test")
  .action(async (options: GlobalOptions) => {
    // 1. Run check
    console.log("📦 Stage 1: Quality Checks");
    const fmtCmd = new Deno.Command("deno", {
      args: ["fmt", "--check"],
      stdout: "inherit",
      stderr: "inherit",
    });
    const fmtStatus = await fmtCmd.spawn().status;
    if (!fmtStatus.success) Deno.exit(fmtStatus.code);

    const lintCmd = new Deno.Command("deno", {
      args: ["lint"],
      stdout: "inherit",
      stderr: "inherit",
    });
    const lintStatus = await lintCmd.spawn().status;
    if (!lintStatus.success) Deno.exit(lintStatus.code);

    // 2. Run types
    const typesRes = await runSuite({
      title: "TYPES",
      categories: typeCategories,
      cmdPreview: "deno check <src/*.ts>",
      isVerbose: Boolean(options.verbose),
      isParallel: Boolean(options.parallel),
      isBench: Boolean(options.bench),
      resolver: (target) => ({
        engine: "deno",
        cmd: ["deno", "check", target.path],
        displayCmd: `deno check ${target.path}`,
      }),
      evaluator: (res: ProcessResult) => {
        const stats = parseDenoCheck(res.combined, res.exitCode);
        return {
          badge: badge(1, "files", stats.errCount, "errors", 0, "warnings"),
          isErr: stats.isErr,
          errCount: stats.errCount,
        };
      },
      successMsg: "✓ 0 type errors across all modules",
      failMsg: (errs) => `✗ ${errs} type errors found`,
    });
    if (!typesRes.success) Deno.exit(1);

    // 3. Run test
    console.log("\n📦 Stage 2: Automated Tests");
    const testRes = await runSuite({
      title: "TEST",
      categories: testCategories,
      cmdPreview: "deno test -A <tests/*_test.ts>",
      isVerbose: Boolean(options.verbose),
      isParallel: Boolean(options.parallel),
      isBench: Boolean(options.bench),
      resolver: (target) => ({
        engine: "deno",
        cmd: ["deno", "test", "-A", target.path],
        displayCmd: `deno test -A ${target.path}`,
      }),
      evaluator: (res: ProcessResult) => {
        const stats = parseTestStats(res.combined, res.exitCode);
        return {
          badge: badge(
            stats.passed,
            "passed",
            stats.failed,
            "failed",
            stats.skipped,
            "skipped",
          ),
          isErr: stats.isErr,
          errCount: stats.failed,
        };
      },
      successMsg: "✓ All test suites passed cleanly",
      failMsg: (errs) => `✗ ${errs} test suites failed`,
    });
    if (!testRes.success) Deno.exit(1);
  })
  // ── DEV COMMAND ────────────────────────────────────────────────────
  .command("dev", "Run tests in watch mode")
  .action(async () => {
    const cmd = new Deno.Command("deno", {
      args: ["test", "--watch", "-A", "tests/"],
      stdout: "inherit",
      stderr: "inherit",
    });
    const status = await cmd.spawn().status;
    if (!status.success) Deno.exit(status.code);
  })
  // ── PREPARE COMMAND ────────────────────────────────────────────────
  .command("prepare", "Prepare CLI dependencies")
  .action(async () => {
    console.log("📦 Preparing CLI engine dependencies...");
    const cmd = new Deno.Command("deno", {
      args: ["install"],
      stdout: "inherit",
      stderr: "inherit",
    });
    const status = await cmd.spawn().status;
    if (!status.success) Deno.exit(status.code);
    console.log("✓ CLI engine dependencies prepared");
  })
  // ── PRUNE COMMAND ──────────────────────────────────────────────────
  .command("prune", "Prune CLI cache artifacts")
  .action(async () => {
    console.log("🧹 Pruning CLI engine cache artifacts...");
    try {
      await Deno.remove("deno.lock");
    } catch {
      // Ignore if missing
    }
    console.log("✓ CLI engine clean");
  });

if (import.meta.main) {
  await cli.parse(Deno.args);
}
