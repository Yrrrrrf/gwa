// main.ts — Master Cliffy CLI driver for GWA Client
import {
  colors,
  Command,
  CompletionsCommand,
  HelpCommand,
} from "../../../cli/src/mod.ts";
import {
  runBuildGate,
  runDev,
  runPreview,
  runTestsGate,
  runTypesGate,
} from "./gates.ts";
import { prepareWorkspace, pruneWorkspace } from "./workspace.ts";

interface GlobalOptions {
  readonly verbose?: boolean;
  readonly parallel?: boolean;
  readonly bench?: boolean;
  readonly failFast?: boolean;
  readonly filter?: string;
  readonly check?: boolean;
}

const cli = new Command()
  .name("gwa-client")
  .version("0.1.0")
  .description("High-performance CLI driver and test dashboard for GWA Client")
  .default("help")
  .globalOption("-v, --verbose", "Show verbose process logs above dashboard")
  .globalOption(
    "-p, --parallel",
    "Execute tasks concurrently across workspaces",
  )
  .globalOption("-b, --bench", "Display task duration benchmarks")
  .globalOption(
    "--fail-fast",
    "Abort suite execution immediately on first error",
  )
  .globalOption("-f, --filter <pattern:string>", "Filter targets by name")
  .command("help", new HelpCommand().global())
  .command("completions", new CompletionsCommand())
  // ── TYPES ───────────────────────────────────────────────────────────
  .command(
    "types [target:string]",
    "Type-check workspaces (SDK modules + SvelteKit apps)",
  )
  .action(async (options: GlobalOptions, target?: string) => {
    const res = await runTypesGate({
      verbose: options.verbose,
      parallel: options.parallel,
      bench: options.bench,
      failFast: options.failFast,
      filter: target ?? options.filter,
    });
    if (!res.success) Deno.exit(1);
  })
  // ── TEST ────────────────────────────────────────────────────────────
  .command("test [target:string]", "Run tests across SDK modules and apps")
  .action(async (options: GlobalOptions, target?: string) => {
    const res = await runTestsGate({
      verbose: options.verbose,
      parallel: options.parallel,
      bench: options.bench,
      failFast: options.failFast,
      filter: target ?? options.filter,
    });
    if (!res.success) Deno.exit(1);
  })
  // ── BUILD ───────────────────────────────────────────────────────────
  .command("build [app:string]", "Build production bundle for apps")
  .action(async (options: GlobalOptions, app?: string) => {
    const res = await runBuildGate({
      verbose: options.verbose,
      parallel: options.parallel,
    }, app);
    if (!res.success) Deno.exit(1);
  })
  // ── DEV / RUN ───────────────────────────────────────────────────────
  .command("dev [app:string]", "Start development server for app")
  .action(async (_options: GlobalOptions, app?: string) => {
    await runDev(app);
  })
  .command("run [app:string]", "Alias for dev")
  .action(async (_options: GlobalOptions, app?: string) => {
    await runDev(app);
  })
  // ── PREVIEW ─────────────────────────────────────────────────────────
  .command("preview [app:string]", "Build and preview production bundle")
  .action(async (options: GlobalOptions, app?: string) => {
    await runPreview(app, { verbose: options.verbose });
  })
  // ── FMT ─────────────────────────────────────────────────────────────
  .command("fmt", "Format source files using Biome")
  .action(async () => {
    const cmd = new Deno.Command("biome", {
      args: ["format", "--config-path=config/biome.json", "--write", "."],
      stdout: "inherit",
      stderr: "inherit",
    });
    const status = await cmd.spawn().status;
    if (!status.success) Deno.exit(status.code);
  })
  // ── LINT ────────────────────────────────────────────────────────────
  .command("lint", "Lint source files using Biome")
  .action(async () => {
    const cmd = new Deno.Command("biome", {
      args: ["lint", "--config-path=config/biome.json", "."],
      stdout: "inherit",
      stderr: "inherit",
    });
    const status = await cmd.spawn().status;
    if (!status.success) Deno.exit(status.code);
  })
  // ── AUDIT & HEALTH ──────────────────────────────────────────────────
  .command("audit", "Audit code namespaces with Fallow")
  .action(async () => {
    const cmd = new Deno.Command("deno", {
      args: ["run", "-A", "npm:fallow", "-c", "config/fallowrc.json"],
      stdout: "inherit",
      stderr: "inherit",
    });
    const status = await cmd.spawn().status;
    if (!status.success) Deno.exit(status.code);
  })
  .command("health", "Score workspace health with Fallow")
  .action(async () => {
    const cmd = new Deno.Command("deno", {
      args: [
        "run",
        "-A",
        "npm:fallow",
        "health",
        "--score",
        "-c",
        "config/fallowrc.json",
      ],
      stdout: "inherit",
      stderr: "inherit",
    });
    const status = await cmd.spawn().status;
    if (!status.success) Deno.exit(status.code);
  })
  // ── COVERAGE ────────────────────────────────────────────────────────
  .command("coverage", "Run test coverage analysis via Vitest")
  .action(async () => {
    const cmd = new Deno.Command("deno", {
      args: [
        "run",
        "-A",
        "npm:vitest",
        "run",
        "--coverage",
        "--config",
        "./config/vitest.config.ts",
      ],
      stdout: "inherit",
      stderr: "inherit",
    });
    const status = await cmd.spawn().status;
    if (!status.success) Deno.exit(status.code);
  })
  // ── PREPARE & PRUNE ─────────────────────────────────────────────────
  .command(
    "prepare",
    "Purge caches & lockfiles, reinstall deps, resync generated code",
  )
  .action(async () => {
    await pruneWorkspace();
    await prepareWorkspace();
  })
  .command("prune", "Prune all node_modules, .svelte-kit, .vite, deno.lock")
  .action(async () => {
    await pruneWorkspace();
  })
  // ── CHECK ───────────────────────────────────────────────────────────
  .command("check [target:string]", "Run fmt, lint, and types quality gates")
  .action(async (options: GlobalOptions, target?: string) => {
    console.log(colors.bold.cyan("🔍 Running format & lint checks..."));
    const fmtCmd = new Deno.Command("biome", {
      args: ["format", "--config-path=config/biome.json", "."],
      stdout: "inherit",
      stderr: "inherit",
    });
    const fmtStatus = await fmtCmd.spawn().status;
    if (!fmtStatus.success) Deno.exit(fmtStatus.code);

    const lintCmd = new Deno.Command("biome", {
      args: ["lint", "--config-path=config/biome.json", "."],
      stdout: "inherit",
      stderr: "inherit",
    });
    const lintStatus = await lintCmd.spawn().status;
    if (!lintStatus.success) Deno.exit(lintStatus.code);

    const typesRes = await runTypesGate({
      ...options,
      filter: target ?? options.filter,
    });
    if (!typesRes.success) Deno.exit(1);
  })
  // ── CI ──────────────────────────────────────────────────────────────
  .command("ci [target:string]", "Run full quality pipeline (check + test)")
  .action(async (options: GlobalOptions, target?: string) => {
    console.log(
      colors.bold.magenta("📦 Stage 1: Quality Gates (fmt, lint, types)"),
    );
    const fmtCmd = new Deno.Command("biome", {
      args: ["format", "--config-path=config/biome.json", "."],
      stdout: "inherit",
      stderr: "inherit",
    });
    const fmtStatus = await fmtCmd.spawn().status;
    if (!fmtStatus.success) Deno.exit(fmtStatus.code);

    const lintCmd = new Deno.Command("biome", {
      args: ["lint", "--config-path=config/biome.json", "."],
      stdout: "inherit",
      stderr: "inherit",
    });
    const lintStatus = await lintCmd.spawn().status;
    if (!lintStatus.success) Deno.exit(lintStatus.code);

    const typesRes = await runTypesGate({
      ...options,
      filter: target ?? options.filter,
    });
    if (!typesRes.success) Deno.exit(1);

    console.log(colors.bold.magenta("\n📦 Stage 2: Automated Tests"));
    const testRes = await runTestsGate({
      ...options,
      filter: target ?? options.filter,
    });
    if (!testRes.success) Deno.exit(1);
  })
  // ── PUBLISH ─────────────────────────────────────────────────────────
  .command("publish", "Run CI pipeline and verify application build")
  .action(async (options: GlobalOptions) => {
    const typesRes = await runTypesGate(options);
    if (!typesRes.success) Deno.exit(1);

    const testRes = await runTestsGate(options);
    if (!testRes.success) Deno.exit(1);

    const buildRes = await runBuildGate(options);
    if (!buildRes.success) Deno.exit(1);

    console.log(colors.bold.green("✓ publish done"));
  });

if (import.meta.main) {
  await cli.parse(Deno.args);
}
