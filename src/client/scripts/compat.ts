import { join, relative } from "jsr:@std/path";

function existsSync(path: string): boolean {
  try {
    Deno.statSync(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures node_modules/vite symlink and native tsgo binary compatibility are present for Deno.
 */
export function ensureNodeCompat(): void {
  const clientRoot = new URL("..", import.meta.url).pathname;
  const candidateRoots = [Deno.cwd(), clientRoot];

  for (const root of candidateRoots) {
    const nm = join(root, "node_modules");
    const viteSymlink = join(nm, "vite");

    if (existsSync(nm)) {
      const denoNm = join(nm, ".deno");
      if (existsSync(denoNm)) {
        try {
          // Ensure node_modules/vite points to @voidzero-dev/vite-plus-core
          for (const entry of Deno.readDirSync(denoNm)) {
            if (entry.name.startsWith("@voidzero-dev+vite-plus-core@")) {
              const coreTarget = join(
                denoNm,
                entry.name,
                "node_modules",
                "@voidzero-dev",
                "vite-plus-core",
              );
              if (existsSync(coreTarget)) {
                try {
                  if (existsSync(viteSymlink)) {
                    const current = Deno.readLinkSync(viteSymlink);
                    if (!current.includes("vite-plus-core")) {
                      Deno.removeSync(viteSymlink);
                      Deno.symlinkSync(relative(nm, coreTarget), viteSymlink);
                    }
                  } else {
                    Deno.symlinkSync(relative(nm, coreTarget), viteSymlink);
                  }
                } catch {
                  // Ignore
                }
              }
              break;
            }
          }

          // Ensure node_modules/typescript symlink is present
          const tsSymlink = join(nm, "typescript");
          if (!existsSync(tsSymlink)) {
            for (const entry of Deno.readDirSync(denoNm)) {
              if (
                entry.name.startsWith("typescript@6") ||
                entry.name.startsWith("typescript@")
              ) {
                const tsTarget = join(
                  denoNm,
                  entry.name,
                  "node_modules",
                  "typescript",
                );
                if (existsSync(tsTarget)) {
                  try {
                    Deno.symlinkSync(relative(nm, tsTarget), tsSymlink);
                  } catch {
                    // Ignore
                  }
                  break;
                }
              }
            }
          }

          // Ensure @sveltejs/kit uses @voidzero-dev/vite-plus-core as vite
          for (const entry of Deno.readDirSync(denoNm)) {
            if (entry.name.startsWith("@sveltejs+kit@")) {
              const kitVite = join(denoNm, entry.name, "node_modules", "vite");
              if (existsSync(kitVite)) {
                try {
                  const current = Deno.readLinkSync(kitVite);
                  if (!current.includes("vite-plus-core")) {
                    for (const e of Deno.readDirSync(denoNm)) {
                      if (e.name.startsWith("@voidzero-dev+vite-plus-core@")) {
                        const coreTarget = join(
                          denoNm,
                          e.name,
                          "node_modules",
                          "@voidzero-dev",
                          "vite-plus-core",
                        );
                        Deno.removeSync(kitVite);
                        Deno.symlinkSync(
                          relative(
                            join(denoNm, entry.name, "node_modules"),
                            coreTarget,
                          ),
                          kitVite,
                        );
                        break;
                      }
                    }
                  }
                } catch {
                  // Ignore
                }
              }
            }
          }

          // Ensure @typescript/native-preview symlink & native TSGO_BIN for svelte-check-native
          const tsScopeDir = join(nm, "@typescript");
          const tsPreviewSymlink = join(tsScopeDir, "native-preview");

          for (const entry of Deno.readDirSync(denoNm)) {
            if (entry.name.startsWith("@typescript+native-preview@")) {
              const previewTarget = join(
                denoNm,
                entry.name,
                "node_modules",
                "@typescript",
                "native-preview",
              );
              if (existsSync(previewTarget)) {
                if (!existsSync(tsScopeDir)) {
                  try {
                    Deno.mkdirSync(tsScopeDir, { recursive: true });
                  } catch {
                    // Ignore
                  }
                }
                if (!existsSync(tsPreviewSymlink)) {
                  const rel = relative(tsScopeDir, previewTarget);
                  try {
                    Deno.symlinkSync(rel, tsPreviewSymlink);
                  } catch {
                    // Ignore
                  }
                }
                const tsgoBin = join(previewTarget, "bin", "tsgo");
                const tsgoJs = join(previewTarget, "bin", "tsgo.js");
                if (existsSync(tsgoBin) && !existsSync(tsgoJs)) {
                  try {
                    Deno.symlinkSync("tsgo", tsgoJs);
                  } catch {
                    // Ignore
                  }
                }
              }
            }

            if (!Deno.env.get("TSGO_BIN")) {
              if (
                entry.name.includes("native-preview-linux-") ||
                entry.name.includes("native-preview-darwin-")
              ) {
                const pkgName = entry.name.replace(/^@typescript\+/, "").split(
                  "@",
                )[0];
                const bin = join(
                  denoNm,
                  entry.name,
                  "node_modules",
                  "@typescript",
                  pkgName,
                  "lib",
                  "tsgo",
                );
                if (existsSync(bin)) {
                  Deno.env.set("TSGO_BIN", bin);
                }
              } else if (
                entry.name.includes("typescript-linux-") ||
                entry.name.includes("typescript-darwin-")
              ) {
                const pkgName = entry.name.replace(/^@typescript\+/, "").split(
                  "@",
                )[0];
                const bin = join(
                  denoNm,
                  entry.name,
                  "node_modules",
                  "@typescript",
                  pkgName,
                  "lib",
                  "tsc",
                );
                if (existsSync(bin)) {
                  Deno.env.set("TSGO_BIN", bin);
                }
              }
            }

            // Ensure vue-tsc resolves typescript@6 instead of breaking under typescript@7
            if (entry.name.startsWith("vue-tsc@")) {
              const vtTs = join(denoNm, entry.name, "node_modules", "typescript");
              if (existsSync(vtTs)) {
                try {
                  const target = Deno.readLinkSync(vtTs);
                  if (target.includes("typescript@7")) {
                    for (const e of Deno.readDirSync(denoNm)) {
                      if (e.name.startsWith("typescript@6")) {
                        const ts6Target = join(
                          denoNm,
                          e.name,
                          "node_modules",
                          "typescript",
                        );
                        Deno.removeSync(vtTs);
                        Deno.symlinkSync(
                          relative(
                            join(denoNm, entry.name, "node_modules"),
                            ts6Target,
                          ),
                          vtTs,
                        );
                        break;
                      }
                    }
                  }
                } catch {
                  // Ignore
                }
              }
            }

            // Ensure @volar/typescript supports Deno CJS module compilation
            if (entry.name.startsWith("@volar+typescript@")) {
              const runTscPath = join(
                denoNm,
                entry.name,
                "node_modules",
                "@volar",
                "typescript",
                "lib",
                "quickstart",
                "runTsc.js",
              );
              if (existsSync(runTscPath)) {
                try {
                  let content = Deno.readTextFileSync(runTscPath);
                  if (!content.includes("Module.prototype._compile")) {
                    const targetHook =
                      "const proxyApiPath = require.resolve('../node/proxyCreateProgram');";
                    const hookCode =
                      `const proxyApiPath = require.resolve('../node/proxyCreateProgram');\n    const Module = require('module');\n    const origCompile = Module.prototype._compile;\n    Module.prototype._compile = function (content, filename, ...rest) {\n        if (filename === tscPath || filename === path.join(path.dirname(tscPath), '_tsc.js')) {\n            try {\n                content = transformTscContent(content, proxyApiPath, extraSupportedExtensions, extraExtensionsToRemove, __filename, typescriptObject);\n            } catch {\n                const requireRegex = /module\\.exports\\s*=\\s*require\\((?:\"|')(?<path>\\.\\/\\w+\\.js)(?:\"|')\\)/;\n                const requirePath = requireRegex.exec(content)?.groups?.path;\n                if (requirePath) {\n                    const realContent = fs.readFileSync(path.join(path.dirname(tscPath), requirePath), 'utf8');\n                    content = transformTscContent(realContent, proxyApiPath, extraSupportedExtensions, extraExtensionsToRemove, __filename, typescriptObject);\n                }\n            }\n        }\n        return origCompile.call(this, content, filename, ...rest);\n    };`;
                    content = content.replace(targetHook, hookCode);
                    content = content.replace(
                      "delete require.cache[tscPath];",
                      "Module.prototype._compile = origCompile;\n        delete require.cache[tscPath];",
                    );
                    Deno.writeTextFileSync(runTscPath, content);
                  }
                } catch {
                  // Ignore
                }
              }
            }
          }
        } catch {
          // Ignored
        }
      }
    }
  }
}

if (import.meta.main) {
  ensureNodeCompat();
}
