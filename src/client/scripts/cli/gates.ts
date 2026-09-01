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
    cmdPreview: "just type-<app> ;; just _type-<engine> <target>",
    isVerbose: Boolean(options.verbose),
    isParallel: Boolean(options.parallel),
    isBench: Boolean(options.bench),
    failFast: Boolean(options.failFast),
    filter: options.filter,
    resolver: (pkg) => {
      // 1. App-specific recipes from check.just
      if (pkg.isApp) {
        return {
          engine: pkg.name,
          cmd: ["just", `type-${pkg.name}`],
          displayCmd: `just type-${pkg.name}`,
        };
      }

      // 2. Svelte SDK packages
      if (pkg.isSvelte) {
        return {
          engine: "svelte",
          cmd: [
            "just",
            "_type-svelte",
            pkg.path,
            "../../config/tsconfig.json",
            "./vite.config.ts",
          ],
          displayCmd: `just _type-svelte <${pkg.path}>`,
        };
      }

      // 3. Pure Deno SDK packages
      return {
        engine: "deno",
        cmd: ["just", "_type-deno", `${pkg.path}/${pkg.entrypoint}`],
        displayCmd: `just _type-deno <${pkg.path}/${pkg.entrypoint}>`,
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
    cmdPreview: "just test-<app> ;; just _test-<engine> <target>",
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

      // 1. App-specific test recipes from test.just
      if (pkg.isApp) {
        return {
          engine: pkg.name,
          cmd: ["just", `test-${pkg.name}`],
          displayCmd: `just test-${pkg.name}`,
        };
      }

      // 2. SDK test recipes
      return {
        engine: pkg.engine,
        cmd: pkg.engine === "vitest"
          ? ["just", "_test-vitest", pkg.name]
          : ["just", "_test-deno", pkg.path],
        displayCmd: pkg.engine === "vitest"
          ? `just _test-vitest <${pkg.name}>`
          : `just _test-deno <${pkg.path}>`,
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
    cmdPreview: "just build-<app>",
    isVerbose: Boolean(options.verbose),
    isParallel: Boolean(options.parallel),
    resolver: (pkg) => ({
      engine: "build",
      cmd: ["just", `build-${pkg.name}`],
      displayCmd: `just build-${pkg.name}`,
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
  if (options.all || targetApp === "all") {
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

  const cmd = new Deno.Command("just", {
    args: [`dev-${selectedApp}`],
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
  if (options.all || targetApp === "all") {
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

  const cmdArgs = [
    "run",
    "-A",
    "npm:vite",
    "preview",
    "--host",
    ...(options.port ? ["--port", String(options.port)] : []),
    ...(options.extraArgs ?? []),
  ];

  const cmd = new Deno.Command("deno", {
    args: cmdArgs,
    cwd: appPath,
    stdout: "inherit",
    stderr: "inherit",
  });
  const status = await cmd.spawn().status;
  if (!status.success) Deno.exit(status.code);
}
