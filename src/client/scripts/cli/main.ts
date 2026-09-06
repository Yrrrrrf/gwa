// main.ts — Master Cliffy CLI driver for GWA Client matrix dashboard gates
import {
  Command,
  CompletionsCommand,
  HelpCommand,
  runMatrixSuite,
} from "../../../cli/src/mod.ts";
import {
  runBuildGate,
  runDev,
  runPreview,
  runTestsGate,
  runTypesGate,
} from "./gates.ts";
import { ensureNodeCompat } from "./workspace.ts";

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
  // ── DYNAMIC PATTERN MATRIX RUNNER ────────────────────────────────────
  .command("matrix", "Execute a declarative pattern-command matrix suite")
  .option("--title <title:string>", "Suite title", { default: "SUITE" })
  .option("--rules <rules:string>", "JSON string array of matrix rules", {
    required: true,
  })
  .action(
    async (
      options: GlobalOptions & { title: string; rules: string },
    ) => {
      let parsedRules = [];
      try {
        parsedRules = JSON.parse(options.rules);
      } catch (e) {
        console.error("Invalid JSON rules:", e);
        Deno.exit(1);
      }
      ensureNodeCompat();
      const res = await runMatrixSuite({
        title: options.title,
        rules: parsedRules,
        verbose: options.verbose,
        parallel: options.parallel,
        bench: options.bench,
        failFast: options.failFast,
        filter: options.filter,
      });
      if (!res.success) Deno.exit(1);
    },
  )
  // ── TYPES ───────────────────────────────────────────────────────────
  .command(
    "types [target:string]",
    "Type-check workspaces across SDKs and Apps",
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
  .option("-A, --all", "Build all applications")
  .action(async (options: GlobalOptions & { all?: boolean }, app?: string) => {
    const targetApp = options.all ? undefined : app;
    const res = await runBuildGate({
      verbose: options.verbose,
      parallel: options.parallel,
      bench: options.bench,
      failFast: options.failFast,
    }, targetApp);
    if (!res.success) Deno.exit(1);
  })
  // ── DEV ─────────────────────────────────────────────────────────────
  .command("dev [app:string]", "Start development server for app")
  .option("-A, --all", "Start dev servers for all applications concurrently")
  .option("--port <port:number>", "Base port number", { default: 5173 })
  .action(async (options: GlobalOptions & { all?: boolean; port?: number }, app?: string) => {
    await runDev(app, {
      all: options.all || app === "all" || app === "--all" || app === "-A",
      port: options.port,
    });
  })
  // ── PREVIEW ─────────────────────────────────────────────────────────
  .command("preview [app:string]", "Preview production bundle")
  .option("-A, --all", "Preview all applications concurrently")
  .option("--port <port:number>", "Base port number", { default: 4173 })
  .action(async (options: GlobalOptions & { all?: boolean; port?: number }, app?: string) => {
    await runPreview(app, {
      all: options.all || app === "all" || app === "--all" || app === "-A",
      port: options.port,
    });
  });

if (import.meta.main) {
  await cli.parse(Deno.args);
}
