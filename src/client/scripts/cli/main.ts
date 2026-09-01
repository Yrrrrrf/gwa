// main.ts — Master Cliffy CLI driver for GWA Client matrix dashboard gates
import {
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

interface GlobalOptions {
  readonly verbose?: boolean;
  readonly parallel?: boolean;
  readonly bench?: boolean;
  readonly failFast?: boolean;
  readonly filter?: string;
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
      bench: options.bench,
      failFast: options.failFast,
    }, app);
    if (!res.success) Deno.exit(1);
  })
  // ── DEV ─────────────────────────────────────────────────────────────
  .command("dev [app:string]", "Start development server for app")
  .action(async (_options: GlobalOptions, app?: string) => {
    await runDev(app);
  })
  // ── PREVIEW ─────────────────────────────────────────────────────────
  .command("preview [app:string]", "Preview production bundle")
  .action(async (_options: GlobalOptions, app?: string) => {
    await runPreview(app);
  });

if (import.meta.main) {
  await cli.parse(Deno.args);
}

