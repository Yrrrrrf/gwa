// matrix.ts — Generic Declarative Pattern-to-Command Matrix Runner for CLI Engine
import { existsSync, walkSync } from "./fs.ts";
import { parseDenoCheck, parseSvelteCheck, parseTestStats } from "./parsers.ts";
import { runSuite } from "./runner.ts";
import { badge } from "./ui.ts";
import type {
  BaseTarget,
  ProcessResult,
  SuiteResult,
  TargetCategory,
} from "./types.ts";

export interface MatrixRule {
  readonly pattern: string;
  readonly engine: string;
  readonly cmd: string;
  readonly evaluator?: "diagnostics" | "svelte-check" | "test" | "exitCode";
}

export interface MatrixOptions {
  readonly title: string;
  readonly rules: readonly MatrixRule[];
  readonly verbose?: boolean;
  readonly parallel?: boolean;
  readonly bench?: boolean;
  readonly failFast?: boolean;
  readonly filter?: string;
}

export interface MatrixTarget extends BaseTarget {
  readonly path: string;
  readonly dir: string;
  readonly file: string;
  readonly category: string;
  readonly rule: MatrixRule;
}

function globToRegex(glob: string): RegExp {
  const normalized = glob.replaceAll("\\", "/");
  const regexStr = normalized
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "___GLOBSTAR___")
    .replace(/\*/g, "[^/]+")
    .replace(/___GLOBSTAR___/g, ".*");
  return new RegExp(`^${regexStr}$`);
}

function extractCategory(dirPath: string): string {
  const clean = dirPath.replaceAll("\\", "/").replace(/^\.\//, "");
  const firstPart = clean.split("/").filter(Boolean)[0] ?? "WORKSPACE";
  return firstPart.toUpperCase();
}

function extractPackageDir(filePath: string): { dir: string; name: string } {
  const clean = filePath.replaceAll("\\", "/").replace(/^\.\//, "");
  const parts = clean.split("/").filter(Boolean);

  if (parts.length >= 2) {
    return {
      dir: `${parts[0]}/${parts[1]}`,
      name: parts[1],
    };
  }
  return {
    dir: clean,
    name: parts[0] ?? clean,
  };
}

function countSourceFiles(dirPath: string): number {
  const srcDir = `${dirPath}/src`;
  if (!existsSync(srcDir)) return 1;
  let count = 0;
  try {
    for (const entry of walkSync(srcDir)) {
      if (entry.isFile) count++;
    }
  } catch {
    // Ignored
  }
  return count > 0 ? count : 1;
}

function interpolate(template: string, target: MatrixTarget): string {
  return template
    .replaceAll("{dir}", target.dir)
    .replaceAll("{file}", target.file)
    .replaceAll("{name}", target.name)
    .replaceAll("{path}", target.path)
    .replaceAll("{target}", target.dir);
}

export function discoverMatrixTargets(
  rules: readonly MatrixRule[],
  rootDir: string = Deno.cwd(),
): TargetCategory<MatrixTarget>[] {
  const claimedDirs = new Set<string>();
  const categoryMap = new Map<string, MatrixTarget[]>();

  const allEntries: string[] = [];
  try {
    for (const entry of walkSync(rootDir, { maxDepth: 5, includeDirs: true })) {
      const rel = entry.path.replace(rootDir, "").replace(/^\//, "").replaceAll(
        "\\",
        "/",
      );
      if (
        rel && !rel.startsWith(".git") && !rel.startsWith("node_modules") &&
        !rel.includes("/node_modules/") && !rel.includes("/.svelte-kit/") &&
        !rel.includes("/dist/") && !rel.includes("/build/")
      ) {
        allEntries.push(rel);
      }
    }
  } catch {
    // Ignore walk errors
  }

  for (const rule of rules) {
    const regex = globToRegex(rule.pattern);
    for (const entryPath of allEntries) {
      if (regex.test(entryPath)) {
        const { dir, name } = extractPackageDir(entryPath);
        if (claimedDirs.has(dir)) continue;
        claimedDirs.add(dir);

        const category = extractCategory(dir);
        const matrixTarget: MatrixTarget = {
          name,
          path: entryPath,
          dir,
          file: entryPath,
          category,
          rule,
        };

        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)?.push(matrixTarget);
      }
    }
  }

  const categories: TargetCategory<MatrixTarget>[] = [];
  for (const [name, targets] of categoryMap.entries()) {
    targets.sort((a, b) => a.name.localeCompare(b.name));
    categories.push({ name, targets });
  }

  // Sort categories: SDK first, then APP, then others
  categories.sort((a, b) => {
    if (a.name === "SDK") return -1;
    if (b.name === "SDK") return 1;
    return a.name.localeCompare(b.name);
  });

  return categories;
}

export async function runMatrixSuite(
  options: MatrixOptions,
): Promise<SuiteResult<MatrixTarget>> {
  const categories = discoverMatrixTargets(options.rules);
  const isTest = options.title.toUpperCase().includes("TEST");

  const distinctEngines = Array.from(new Set(options.rules.map((r) => r.engine)));
  const previewCmds = isTest
    ? "deno test <sdk/*> ;; vitest <apps/*>"
    : distinctEngines.map((e) => `${e} <tsconfig/mod>`).join(" ;; ");

  return await runSuite<MatrixTarget>({
    title: options.title,
    categories,
    cmdPreview: previewCmds,
    isVerbose: Boolean(options.verbose),
    isParallel: Boolean(options.parallel),
    isBench: Boolean(options.bench),
    failFast: Boolean(options.failFast),
    filter: options.filter,
    resolver: (target) => {
      const rawCmd = interpolate(target.rule.cmd, target);
      const cmdParts = rawCmd.split(/\s+/).filter(Boolean);

      return {
        engine: target.rule.engine,
        cwd: Deno.cwd(),
        cmd: cmdParts,
        displayCmd: rawCmd,
      };
    },
    evaluator: (res: ProcessResult, target: MatrixTarget) => {
      const evalType = target.rule.evaluator ??
        (isTest || target.rule.engine === "vitest"
          ? "test"
          : target.rule.engine === "svelte-check"
          ? "svelte-check"
          : "diagnostics");

      if (evalType === "test") {
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
      }

      const filesCount = countSourceFiles(target.dir);

      if (evalType === "svelte-check") {
        const stats = parseSvelteCheck(res.combined, res.exitCode);
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
      }

      const stats = parseDenoCheck(res.combined, res.exitCode);
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
    successMsg: `✓ All ${options.title.toLowerCase()} suites passed cleanly`,
    failMsg: (errs) => `✗ ${errs} ${options.title.toLowerCase()} errors found`,
  });
}
