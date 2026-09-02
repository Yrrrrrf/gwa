// gates.ts — Declarative quality gates for types, tests, builds, dev, and preview for GWA Client
import {
  badge,
  banner,
  colors,
  existsSync,
  installSignalTraps,
  join,
  parseDenoCheck,
  parseSvelteCheck,
  parseTestStats,
  type ProcessResult,
  runSuite,
  Select,
  spawnStreamingProcess,
  type SuiteResult,
  walkSync,
} from "../../../cli/src/mod.ts";
import {
  type ClientPackage,
  discoverPackages,
  ensureNodeCompat,
  getAppTargets,
  getWorkspaceCategories,
} from "./workspace.ts";

export interface GateOptions {
  readonly verbose?: boolean;
  readonly parallel?: boolean;
  readonly bench?: boolean;
  readonly failFast?: boolean;
  readonly filter?: string;
}

export interface ServerOptions {
  readonly all?: boolean;
  readonly port?: number;
  readonly extraArgs?: readonly string[];
}

function countSourceFiles(pkgPath: string): number {
  const srcDir = join(pkgPath, "src");
  if (!existsSync(srcDir)) return 0;
  let count = 0;
  try {
    for (const entry of walkSync(srcDir)) {
      if (entry.isFile) count++;
    }
  } catch {
    // Ignored
  }
  return count;
}

const APP_COLOR_FNS = [
  colors.bold.cyan,
  colors.bold.magenta,
  colors.bold.yellow,
  colors.bold.green,
  colors.bold.blue,
];

function formatAppTag(name: string, index: number, maxLen: number = 7): string {
  const colorFn = APP_COLOR_FNS[index % APP_COLOR_FNS.length];
  const padded = name.padEnd(maxLen, " ");
  return colorFn(`[${padded}]`);
}

// ── TYPES GATE ─────────────────────────────────────────────────────────

export async function runTypesGate(
  options: GateOptions = {},
): Promise<SuiteResult<ClientPackage>> {
  ensureNodeCompat();

  return await runSuite<ClientPackage>({
    title: "TYPES",
    categories: getWorkspaceCategories(),
    cmdPreview:
      "deno check <src/*.ts> ;; svelte-check <tsconfig.json> ;; vue-tsc <tsconfig.json> ;; tsc <tsconfig.json>",
    isVerbose: Boolean(options.verbose),
    isParallel: Boolean(options.parallel),
    isBench: Boolean(options.bench),
    failFast: Boolean(options.failFast),
    filter: options.filter,
    resolver: (pkg) => {
      if (pkg.isSvelte) {
        const vcfg = existsSync(join(pkg.path, "vite.config.mts"))
          ? "./vite.config.mts"
          : existsSync(join(pkg.path, "vite.config.ts"))
          ? "./vite.config.ts"
          : "";

        const tsc = existsSync(join(pkg.path, "tsconfig.json"))
          ? "./tsconfig.json"
          : "../../config/tsconfig.json";

        const cfgFlags = vcfg
          ? ["--tsconfig", tsc, "--config", vcfg]
          : ["--tsconfig", tsc];

        if (!pkg.isApp) {
          cfgFlags.push("--threshold", "error");
        }

        const displayTsc = existsSync(join(pkg.path, "tsconfig.json"))
          ? `${pkg.path}/tsconfig.json`
          : "config/tsconfig.json";

        const displayVcfg = vcfg ? `${pkg.path}/${vcfg.replace("./", "")}` : "";
        const displayCmd = displayVcfg
          ? `deno run -A npm:svelte-check --tsconfig ${displayTsc} --config <${displayVcfg}>`
          : `deno run -A npm:svelte-check --tsconfig <${displayTsc}>`;

        return {
          engine: "svelte-check",
          cwd: pkg.path,
          cmd: ["deno", "run", "-A", "npm:svelte-check@^4.7.5", ...cfgFlags],
          displayCmd,
        };
      }

      const checkTarget = existsSync(join(pkg.path, "src/lib/mod.ts"))
        ? "src/lib/mod.ts"
        : existsSync(join(pkg.path, "src/mod.ts"))
        ? "src/mod.ts"
        : "src/main.ts";

      return {
        engine: "deno",
        cwd: pkg.path,
        cmd: ["deno", "check", checkTarget],
        displayCmd: `deno check <${pkg.path}/${checkTarget}>`,
      };
    },
    evaluator: (res: ProcessResult, pkg: ClientPackage) => {
      const stats = pkg.isSvelte
        ? parseSvelteCheck(res.combined, res.exitCode)
        : parseDenoCheck(res.combined, res.exitCode);
      const filesCount = countSourceFiles(pkg.path);

      return {
        badge: badge(
          filesCount,
          "files",
          stats.errCount,
          "errors",
          stats.warnCount,
          "warnings",
        ),
        isErr: stats.isErr,
        errCount: stats.errCount,
      };
    },
    successMsg: "✓ 0 type errors across all workspaces",
    failMsg: (errs) => `✗ ${errs} type checking errors found`,
  });
}

// ── TEST GATE ──────────────────────────────────────────────────────────

export async function runTestsGate(
  options: GateOptions = {},
): Promise<SuiteResult<ClientPackage>> {
  return await runSuite<ClientPackage>({
    title: "TEST",
    categories: getWorkspaceCategories(),
    cmdPreview:
      "deno run -A npm:vitest run --config ./config/vitest.config.ts --project <sdk/*>",
    isVerbose: Boolean(options.verbose),
    isParallel: Boolean(options.parallel),
    isBench: Boolean(options.bench),
    failFast: Boolean(options.failFast),
    filter: options.filter,
    resolver: (pkg) => {
      if (!pkg.hasTests) {
        return {
          engine: pkg.engine,
          skip: "no tests",
          badge: badge(0, "passed", 0, "failed", 0, "skipped"),
        };
      }

      if (pkg.engine === "vitest") {
        return {
          engine: "vitest",
          cwd: "",
          cmd: [
            "deno",
            "run",
            "-A",
            "npm:vitest",
            "run",
            "--config",
            "./config/vitest.config.ts",
            "--project",
            pkg.name,
          ],
          displayCmd:
            `deno run -A npm:vitest run --config ./config/vitest.config.ts --project <${pkg.name}>`,
        };
      }

      return {
        engine: "deno",
        cwd: "",
        cmd: ["deno", "test", "--allow-all", pkg.path],
        displayCmd: `deno test --allow-all <${pkg.path}>`,
      };
    },
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
}

// ── BUILD GATE ─────────────────────────────────────────────────────────

export async function runBuildGate(
  options: GateOptions = {},
  targetApp?: string,
): Promise<SuiteResult<ClientPackage>> {
  const targets = getAppTargets(targetApp);
  if (targets.length === 0) {
    console.warn(colors.yellow("No applications found in apps/"));
    Deno.exit(1);
  }

  return await runSuite<ClientPackage>({
    title: "BUILDING",
    categories: [{ name: "APP", targets }],
    cmdPreview: "cd <apps/*> ;; deno run -A npm:vite build",
    isVerbose: Boolean(options.verbose),
    isParallel: Boolean(options.parallel),
    resolver: (pkg) => ({
      engine: "vite build",
      cwd: pkg.path,
      pre: async () => {
        try {
          await Deno.remove(join(pkg.path, "build"), { recursive: true });
        } catch {
          // Ignored
        }
        try {
          await Deno.remove(join(pkg.path, "dist"), { recursive: true });
        } catch {
          // Ignored
        }
      },
      cmd: ["deno", "run", "-A", "npm:vite", "build"],
      displayCmd: `cd <${pkg.path}> ;; deno run -A npm:vite build`,
    }),
    evaluator: (res: ProcessResult) => {
      const isOk = res.exitCode === 0;
      return {
        badge: isOk ? colors.green("✓ success") : colors.bold.red("✗ failed"),
        isErr: !isOk,
        errCount: isOk ? 0 : 1,
      };
    },
    successMsg: "✓ All applications built successfully",
    failMsg: (errs) => `✗ ${errs} build failed`,
  });
}

// ── DEV SERVER (SINGLE & CONCURRENT MULTI-APP) ─────────────────────────

export async function runDev(
  targetApp?: string,
  options: ServerOptions = {},
): Promise<void> {
  const apps = discoverPackages("apps");
  if (apps.length === 0) {
    console.warn(colors.yellow("No applications found in apps/"));
    return;
  }

  // Multi-app concurrent dev mode via --all / -A
  if (options.all || targetApp === "all" || targetApp === "--all" || targetApp === "-A") {
    installSignalTraps();
    const basePort = options.port ?? 5173;
    console.log(
      banner(
        `🚀 Starting ${apps.length} dev servers concurrently across apps:`,
        "magenta",
      ),
    );

    const maxNameLen = Math.max(...apps.map((a) => a.name.length));
    for (let i = 0; i < apps.length; i++) {
      const app = apps[i];
      const port = basePort + i;
      const tag = formatAppTag(app.name, i, maxNameLen);
      console.log(`  • ${tag} ➜ http://localhost:${port}/ (${app.path})`);
    }
    console.log("");

    const abortController = new AbortController();
    const tasks = apps.map((app, i) => {
      const port = String(basePort + i);
      const tag = formatAppTag(app.name, i, maxNameLen);
      return spawnStreamingProcess({
        cmd: [
          "deno",
          "run",
          "-A",
          "npm:vite",
          "dev",
          "--port",
          port,
          "--host",
          ...(options.extraArgs ?? []),
        ],
        cwd: app.path,
        signal: abortController.signal,
        onLine: (line) => {
          console.log(`  ${tag} ${colors.gray("│")} ${line}`);
        },
      });
    });

    await Promise.all(tasks);
    return;
  }

  let selectedApp = targetApp?.replace(/^apps\//, "");
  if (!selectedApp) {
    if (apps.length === 1) {
      selectedApp = apps[0].name;
    } else {
      console.log("");
      selectedApp = await Select.prompt({
        message: "Select app to run",
        options: apps.map((a) => ({ name: a.name, value: a.name })),
      });
    }
  }

  const appPath = `apps/${selectedApp}`;
  if (!existsSync(appPath)) {
    console.error(colors.red(`Application not found: ${appPath}`));
    Deno.exit(1);
  }

  console.log(banner(`🚀 Starting dev server: ${appPath}`, "magenta"));

  const cmd = new Deno.Command("deno", {
    args: ["run", "-A", "npm:vite", "dev", "--host", ...(options.extraArgs ?? [])],
    cwd: appPath,
    stdout: "inherit",
    stderr: "inherit",
  });
  const status = await cmd.spawn().status;
  if (!status.success) Deno.exit(status.code);
}

// ── PREVIEW SERVER (SINGLE & CONCURRENT MULTI-APP) ─────────────────────

export async function runPreview(
  targetApp?: string,
  options: ServerOptions = {},
): Promise<void> {
  const apps = discoverPackages("apps");
  if (apps.length === 0) {
    console.warn(colors.yellow("No applications found in apps/"));
    return;
  }

  // Multi-app concurrent preview mode via --all / -A
  if (options.all || targetApp === "all" || targetApp === "--all" || targetApp === "-A") {
    installSignalTraps();
    const basePort = options.port ?? 4173;
    console.log(
      banner(
        `🎪 Previewing ${apps.length} production builds concurrently across apps:`,
        "magenta",
      ),
    );

    const maxNameLen = Math.max(...apps.map((a) => a.name.length));
    for (let i = 0; i < apps.length; i++) {
      const app = apps[i];
      const port = basePort + i;
      const tag = formatAppTag(app.name, i, maxNameLen);
      console.log(`  • ${tag} ➜ http://localhost:${port}/ (${app.path})`);
    }
    console.log("");

    const abortController = new AbortController();
    const tasks = apps.map((app, i) => {
      const port = String(basePort + i);
      const tag = formatAppTag(app.name, i, maxNameLen);
      return spawnStreamingProcess({
        cmd: [
          "deno",
          "run",
          "-A",
          "npm:vite",
          "preview",
          "--port",
          port,
          "--host",
          ...(options.extraArgs ?? []),
        ],
        cwd: app.path,
        signal: abortController.signal,
        onLine: (line) => {
          console.log(`  ${tag} ${colors.gray("│")} ${line}`);
        },
      });
    });

    await Promise.all(tasks);
    return;
  }

  let selectedApp = targetApp?.replace(/^apps\//, "");
  if (!selectedApp) {
    if (apps.length === 1) {
      selectedApp = apps[0].name;
    } else {
      console.log("");
      selectedApp = await Select.prompt({
        message: "Select app to preview",
        options: apps.map((a) => ({ name: a.name, value: a.name })),
      });
    }
  }

  const appPath = `apps/${selectedApp}`;
  if (!existsSync(appPath)) {
    console.error(colors.red(`Application not found: ${appPath}`));
    Deno.exit(1);
  }

  console.log(banner(`🎪 Previewing production build: ${appPath}`, "magenta"));

  const cmd = new Deno.Command("deno", {
    args: ["run", "-A", "npm:vite", "preview"],
    cwd: appPath,
    stdout: "inherit",
    stderr: "inherit",
  });
  const status = await cmd.spawn().status;
  if (!status.success) Deno.exit(status.code);
}
