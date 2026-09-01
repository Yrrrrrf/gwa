// workspace.ts — Dynamic workspace discovery and lifecycle maintenance for GWA Client
import {
  type BaseTarget,
  colors,
  existsSync,
  join,
  relative,
  type TargetCategory,
  walkSync,
} from "../../../cli/src/mod.ts";


export interface ClientPackage extends BaseTarget {
  readonly path: string;
  readonly isApp: boolean;
  readonly isSvelte: boolean;
  readonly hasTests: boolean;
  readonly engine: string;
  readonly typeEngine: string;
}

function hasPattern(dir: string, regex: RegExp): boolean {
  if (!existsSync(dir)) return false;
  try {
    for (const entry of walkSync(dir, { maxDepth: 4 })) {
      if (regex.test(entry.path)) return true;
    }
  } catch {
    // Ignore access errors
  }
  return false;
}

export function inspectPackage(pkgDir: string): ClientPackage {
  const clean = pkgDir.replaceAll("\\", "/");
  const parts = clean.split("/").filter(Boolean);
  const name = parts[parts.length - 1] ?? clean;
  const isApp = clean.startsWith("apps/") || clean.includes("/apps/");

  const hasVite = existsSync(join(clean, "vite.config.ts")) ||
    existsSync(join(clean, "vite.config.mts")) ||
    existsSync(join(clean, "vite.config.js"));

  const hasSvelteFiles = hasPattern(
    join(clean, "src"),
    /\.(svelte|svelte\.ts)$/,
  );
  const isSvelte = isApp || hasVite || hasSvelteFiles;

  const hasTests = hasPattern(clean, /\.(test|spec)\.ts$/);

  return {
    name,
    path: clean,
    isApp,
    isSvelte,
    hasTests,
    engine: isSvelte ? "vitest" : "deno",
    typeEngine: isSvelte ? "svelte-check" : "deno",
  };
}

export function discoverPackages(dirName: "sdk" | "apps"): ClientPackage[] {
  const root = Deno.cwd();
  const targetDir = join(root, dirName);
  if (!existsSync(targetDir)) return [];

  const pkgs: ClientPackage[] = [];
  for (const entry of Deno.readDirSync(targetDir)) {
    if (entry.isDirectory) {
      pkgs.push(inspectPackage(`${dirName}/${entry.name}`));
    }
  }
  return pkgs.sort((a, b) => a.name.localeCompare(b.name));
}

export function getWorkspaceCategories(): TargetCategory<ClientPackage>[] {
  return [
    {
      name: "SDK",
      targets: discoverPackages("sdk"),
    },
    {
      name: "APP",
      targets: discoverPackages("apps"),
    },
  ];
}

export function getAppTargets(appFilter?: string): ClientPackage[] {
  const apps = discoverPackages("apps");
  if (!appFilter) return apps;

  const clean = appFilter.replaceAll("\\", "").replace(/^apps\//, "");
  const match = apps.find((a) => a.name === clean);
  if (!match) {
    console.error(colors.red(`Application not found: apps/${clean}`));
    Deno.exit(1);
  }
  return [match];
}

/**
 * Ensures node_modules/vite symlink is present for Deno module resolution compatibility.
 */
export function ensureNodeCompat(): void {
  const cwd = Deno.cwd();
  const nm = join(cwd, "node_modules");
  const viteSymlink = join(nm, "vite");

  if (existsSync(nm) && !existsSync(viteSymlink)) {
    try {
      const denoNm = join(nm, ".deno");
      if (existsSync(denoNm)) {
        for (const entry of Deno.readDirSync(denoNm)) {
          if (entry.name.startsWith("vite@")) {
            const viteTarget = join(denoNm, entry.name, "node_modules", "vite");
            if (existsSync(viteTarget)) {
              const rel = relative(nm, viteTarget);
              try {
                Deno.symlinkSync(rel, viteSymlink);
              } catch {
                // Ignore symlink failure if already exists
              }
              break;
            }
          }
        }
      }
    } catch {
      // Ignored
    }
  }
}

