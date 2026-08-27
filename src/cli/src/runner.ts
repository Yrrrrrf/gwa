// runner.ts — Generic suite runner & concurrency scheduler
// Supports sequential and parallel execution, 60 FPS live clock ticker, and CI fallback

import { colors } from "jsr:@cliffy/ansi@1.2.1/colors";
import {
  clampLine,
  cursorUp,
  eraseDown,
  getConsoleSize,
  hideCursor,
  installSignalTraps,
  isHeadlessCI,
  isTTY,
  linkifyErrors,
  shouldDegradeToLinear,
  showCursor,
} from "./terminal.ts";
import {
  banner,
  buildTableLines,
  chevron,
  formatDuration,
  renderCmdList,
  renderCmdTemplate,
  SPINNER_FRAMES,
} from "./ui.ts";
import { spawnStreamingProcess } from "./process.ts";
import type {
  BaseTarget,
  ProcessResult,
  SuiteOptions,
  SuiteResult,
  TaskState,
} from "./types.ts";

export async function runSuite<
  TTarget extends BaseTarget,
  TResult = unknown,
  TContext = unknown,
>(
  options: SuiteOptions<TTarget, TResult, TContext>,
): Promise<SuiteResult<TTarget, TResult, TContext>> {
  installSignalTraps();
  const suiteStartMs = Date.now();

  // 1. Render Template Preview if provided
  if (options.cmdPreview) {
    renderCmdTemplate(options.cmdPreview);
  }

  // 2. Build Concrete Commands Manifest & Initial State
  const concreteCmds: string[] = [];
  const stateRecords: TaskState<TTarget, TResult, TContext>[] = [];

  for (const cat of options.categories) {
    for (const target of cat.targets) {
      if (options.filter && !target.name.includes(options.filter)) {
        continue;
      }

      const plan = await options.resolver(target, options.context as TContext);
      if (plan.displayCmd) {
        concreteCmds.push(plan.displayCmd);
      }

      const isSkipped = Boolean(plan.skip);
      const skipBadge = isSkipped
        ? `${plan.badge ?? ""} ${colors.gray(`[${plan.skip}]`)}`.trim()
        : "";

      stateRecords.push({
        cat: cat.name,
        target,
        plan,
        status: isSkipped ? "skipped" : "pending",
        badge: skipBadge,
        durationStr: "",
        isErr: false,
        output: "",
      });
    }
  }

  // Upfront concrete commands manifest (standard mode)
  if (!options.isVerbose && concreteCmds.length > 0) {
    console.log("");
    renderCmdList(concreteCmds);
  }

  // Initial table render
  const initialLines = buildTableLines(stateRecords, "", options.isBench);
  let tableHeight = initialLines.length;

  const tooSmall = shouldDegradeToLinear(tableHeight);
  const headless = isHeadlessCI() || tooSmall;
  const tty = isTTY() && !headless;

  if (tty) {
    console.log("");
    console.log(initialLines.join("\n"));
  }

  let totalErrors = 0;
  const abortController = new AbortController();
  if (options.abortSignal) {
    options.abortSignal.addEventListener("abort", () => {
      abortController.abort();
    });
  }

  if (tty) {
    hideCursor();
  }

  try {
    if (options.isParallel) {
      // ══════════════════════════════════════════════════════
      // PARALLEL EXECUTION MODE
      // ══════════════════════════════════════════════════════

      // 1. Run sequential pre-steps first
      for (const rec of stateRecords) {
        if (rec.status !== "skipped" && rec.plan.pre) {
          try {
            await rec.plan.pre(rec.target, options.context as TContext);
          } catch (err) {
            rec.status = "failed";
            rec.isErr = true;
            rec.output = String(err);
            totalErrors++;
          }
        }
      }

      // 2. In verbose mode, print all triggering commands above the table
      if (options.isVerbose && tty) {
        const consoleRows = getConsoleSize().rows;
        if (tableHeight < consoleRows - 2) {
          Deno.stdout.writeSync(
            new TextEncoder().encode(`${cursorUp(tableHeight)}${eraseDown}\r`),
          );
          for (const rec of stateRecords) {
            if (rec.status !== "skipped") {
              const rawCmd = rec.plan.displayCmd ?? rec.plan.cmd?.join(" ") ??
                "";
              console.log(rawCmd.replace(/<|>/g, ""));
            }
          }
          console.log("");
          const curTbl = buildTableLines(stateRecords, "⠋", options.isBench);
          console.log(curTbl.join("\n"));
          tableHeight = curTbl.length;
        }
      }

      // 3. Spawn all active tasks concurrently
      const bufferedLogs: Map<number, string[]> = new Map();
      const activePromises: Promise<void>[] = [];

      for (let i = 0; i < stateRecords.length; i++) {
        const rec = stateRecords[i];
        if (rec.status === "skipped" || rec.status === "failed") continue;

        rec.status = "running";
        rec.startMs = Date.now();
        bufferedLogs.set(i, []);

        if (headless) {
          console.log(
            `  ${chevron()} ${colors.gray(rec.plan.engine)} ${
              colors.bold(rec.target.name)
            } ${colors.gray("running...")}`,
          );
        }

        if (!rec.plan.cmd) {
          rec.status = "done";
          rec.durationStr = "0ms";
          continue;
        }

        const taskPromise = (async (
          idx: number,
          state: TaskState<TTarget, TResult, TContext>,
        ) => {
          const res = await spawnStreamingProcess({
            cmd: state.plan.cmd!,
            cwd: state.plan.cwd,
            env: state.plan.env,
            signal: abortController.signal,
            onLine: (line) => {
              if (options.isVerbose) {
                bufferedLogs.get(idx)?.push(line);
              }
            },
          });

          const elapsedMs = Date.now() - (state.startMs ?? Date.now());
          state.elapsedMs = elapsedMs;
          state.output = res.combined;

          const evaluation = await options.evaluator(
            res,
            state.target,
            options.context as TContext,
          );
          state.evalData = evaluation.data;
          state.badge = evaluation.badge;
          state.isErr = evaluation.isErr;
          state.status = evaluation.isErr ? "failed" : "done";
          state.durationStr = evaluation.isErr ? "" : formatDuration(elapsedMs);

          if (evaluation.isErr) {
            totalErrors += Math.max(evaluation.errCount, 1);
            if (options.failFast) {
              abortController.abort();
            }
          }

          // If parallel verbose mode: flush coherent buffered log block once task finishes
          if (options.isVerbose && tty) {
            const logs = bufferedLogs.get(idx) ?? [];
            if (logs.length > 0) {
              Deno.stdout.writeSync(
                new TextEncoder().encode(
                  `${cursorUp(tableHeight)}${eraseDown}\r`,
                ),
              );
              const rawCmd = state.plan.displayCmd ??
                state.plan.cmd?.join(" ") ?? "";
              console.log(rawCmd.replace(/<|>/g, ""));
              for (const l of logs) {
                console.log(`    ${colors.gray("│")} ${l}`);
              }
              console.log("");
              const updatedTbl = buildTableLines(
                stateRecords,
                "⠋",
                options.isBench,
              );
              console.log(updatedTbl.join("\n"));
              tableHeight = updatedTbl.length;
            }
          } else if (headless) {
            console.log(
              `  ${chevron()} ${colors.gray(state.plan.engine)} ${
                colors.bold(state.target.name)
              } ${state.badge} (${state.durationStr || "failed"})`,
            );
          }
        })(i, rec);

        activePromises.push(taskPromise);
      }

      // 4. Multi-job animation ticker at 60 FPS (~33ms)
      if (tty) {
        let frameIdx = 0;
        const frames = SPINNER_FRAMES;
        while (stateRecords.some((r) => r.status === "running")) {
          const frame = frames[frameIdx % frames.length];
          frameIdx++;

          const consoleRows = getConsoleSize().rows;
          if (tableHeight < consoleRows - 2) {
            Deno.stdout.writeSync(
              new TextEncoder().encode(
                `${cursorUp(tableHeight)}\r${eraseDown}`,
              ),
            );
            const curTbl = buildTableLines(
              stateRecords,
              frame,
              options.isBench,
            );
            console.log(curTbl.join("\n"));
            tableHeight = curTbl.length;
          }

          await new Promise((r) => setTimeout(r, 40));
        }
      }

      await Promise.all(activePromises);

      // In non-verbose mode, print error traces for failed tasks above final table
      if (!options.isVerbose) {
        for (const rec of stateRecords) {
          if (rec.isErr && rec.output) {
            const errLines = rec.output
              .split("\n")
              .filter((l) => l.trim().length > 0)
              .slice(-15)
              .map((l) =>
                `    ${colors.red("│")} ${clampLine(linkifyErrors(l))}`
              );

            if (errLines.length > 0) {
              console.log("");
              console.log(`  ${colors.bold.red(`Failed: ${rec.target.name}`)}`);
              console.log(errLines.join("\n"));
              console.log("");
            }
          }
        }
      }

      // Redraw clean final table
      if (tty) {
        Deno.stdout.writeSync(
          new TextEncoder().encode(`${cursorUp(tableHeight)}${eraseDown}\r`),
        );
        const finalTbl = buildTableLines(stateRecords, "", options.isBench);
        console.log(finalTbl.join("\n"));
      }
    } else {
      // ══════════════════════════════════════════════════════
      // SEQUENTIAL EXECUTION MODE
      // ══════════════════════════════════════════════════════

      for (let i = 0; i < stateRecords.length; i++) {
        const rec = stateRecords[i];
        if (rec.status === "skipped") continue;

        // Run pre-step if present
        if (rec.plan.pre) {
          try {
            await rec.plan.pre(rec.target, options.context as TContext);
          } catch (err) {
            rec.status = "failed";
            rec.isErr = true;
            rec.output = String(err);
            totalErrors++;
            continue;
          }
        }

        rec.status = "running";
        rec.startMs = Date.now();

        if (headless) {
          console.log(
            `  ${chevron()} ${colors.gray(rec.plan.engine)} ${
              colors.bold(rec.target.name)
            } ${colors.gray("running...")}`,
          );
        }

        // In verbose mode, clear table, print command above, redraw table below
        if (options.isVerbose && tty) {
          const rawCmd = rec.plan.displayCmd ?? rec.plan.cmd?.join(" ") ?? "";
          Deno.stdout.writeSync(
            new TextEncoder().encode(`${cursorUp(tableHeight)}${eraseDown}\r`),
          );
          console.log(rawCmd.replace(/<|>/g, ""));
          const curTbl = buildTableLines(stateRecords, "⠋", options.isBench);
          console.log(curTbl.join("\n"));
          tableHeight = curTbl.length;
        }

        if (!rec.plan.cmd) {
          rec.status = "done";
          rec.durationStr = "0ms";
          continue;
        }

        const unbufferedLines: string[] = [];
        const liveTailLines: string[] = [];
        const MAX_LIVE_TAIL = 5;
        let lastTailHeight = 0;
        let runningProcessDone = false;

        // Background ticker for sequential row
        let frameIdx = 0;
        const tickerPromise = (async () => {
          if (!tty) return;
          while (!runningProcessDone) {
            const frame = SPINNER_FRAMES[frameIdx % SPINNER_FRAMES.length];
            frameIdx++;

            const consoleRows = getConsoleSize().rows;
            const requiredRows = tableHeight +
              (options.isVerbose ? 0 : lastTailHeight);
            if (requiredRows < consoleRows - 2) {
              if (options.isVerbose && unbufferedLines.length > 0) {
                // Flush new lines above table and redraw table below
                Deno.stdout.writeSync(
                  new TextEncoder().encode(
                    `${cursorUp(tableHeight)}${eraseDown}\r`,
                  ),
                );
                for (const l of unbufferedLines) {
                  console.log(`    ${colors.gray("│")} ${l}`);
                }
                unbufferedLines.length = 0;
                const curTbl = buildTableLines(
                  stateRecords,
                  frame,
                  options.isBench,
                );
                console.log(curTbl.join("\n"));
                tableHeight = curTbl.length;
              } else if (!options.isVerbose && liveTailLines.length > 0) {
                // Standard mode: render clamped live tail window above table
                Deno.stdout.writeSync(
                  new TextEncoder().encode(
                    `${cursorUp(tableHeight + lastTailHeight)}${eraseDown}\r`,
                  ),
                );
                for (const l of liveTailLines) {
                  console.log(`    ${colors.gray("│")} ${colors.gray(l)}`);
                }
                lastTailHeight = liveTailLines.length;
                const curTbl = buildTableLines(
                  stateRecords,
                  frame,
                  options.isBench,
                );
                console.log(curTbl.join("\n"));
                tableHeight = curTbl.length;
              } else {
                Deno.stdout.writeSync(
                  new TextEncoder().encode(
                    `${cursorUp(tableHeight + lastTailHeight)}\r${eraseDown}`,
                  ),
                );
                if (lastTailHeight > 0) {
                  for (const l of liveTailLines) {
                    console.log(`    ${colors.gray("│")} ${colors.gray(l)}`);
                  }
                }
                const curTbl = buildTableLines(
                  stateRecords,
                  frame,
                  options.isBench,
                );
                console.log(curTbl.join("\n"));
                tableHeight = curTbl.length;
              }
            }

            await new Promise((r) => setTimeout(r, 50));
          }
        })();

        const res: ProcessResult = await spawnStreamingProcess({
          cmd: rec.plan.cmd,
          cwd: rec.plan.cwd,
          env: rec.plan.env,
          signal: abortController.signal,
          onLine: (line) => {
            if (options.isVerbose) {
              if (tty) {
                unbufferedLines.push(linkifyErrors(line));
              } else {
                console.log(`    ${colors.gray("│")} ${linkifyErrors(line)}`);
              }
            } else if (tty) {
              const trimmed = line.trim();
              if (trimmed.length > 0) {
                liveTailLines.push(clampLine(linkifyErrors(trimmed)));
                if (liveTailLines.length > MAX_LIVE_TAIL) {
                  liveTailLines.shift();
                }
              }
            }
          },
        });

        runningProcessDone = true;
        await tickerPromise;

        // Clean up temporary live tail window in standard mode
        if (!options.isVerbose && tty && lastTailHeight > 0) {
          Deno.stdout.writeSync(
            new TextEncoder().encode(
              `${cursorUp(tableHeight + lastTailHeight)}${eraseDown}\r`,
            ),
          );
          lastTailHeight = 0;
          const curTbl = buildTableLines(stateRecords, "", options.isBench);
          console.log(curTbl.join("\n"));
          tableHeight = curTbl.length;
        }

        const elapsedMs = Date.now() - (rec.startMs ?? Date.now());
        rec.elapsedMs = elapsedMs;
        rec.output = res.combined;

        const evaluation = await options.evaluator(
          res,
          rec.target,
          options.context as TContext,
        );
        rec.evalData = evaluation.data;
        rec.badge = evaluation.badge;
        rec.isErr = evaluation.isErr;
        rec.status = evaluation.isErr ? "failed" : "done";
        rec.durationStr = evaluation.isErr ? "" : formatDuration(elapsedMs);

        if (evaluation.isErr) {
          totalErrors += Math.max(evaluation.errCount, 1);
        }

        // Flush any remaining verbose lines
        if (options.isVerbose && tty && unbufferedLines.length > 0) {
          Deno.stdout.writeSync(
            new TextEncoder().encode(`${cursorUp(tableHeight)}${eraseDown}\r`),
          );
          for (const l of unbufferedLines) {
            console.log(`    ${colors.gray("│")} ${l}`);
          }
          console.log("");
          const curTbl = buildTableLines(stateRecords, "", options.isBench);
          console.log(curTbl.join("\n"));
          tableHeight = curTbl.length;
        }

        if (tty) {
          Deno.stdout.writeSync(
            new TextEncoder().encode(`${cursorUp(tableHeight)}${eraseDown}\r`),
          );
        }

        // If failed in standard mode, print error trace above table with clickable links
        if (!options.isVerbose && evaluation.isErr && rec.output) {
          const errLines = rec.output
            .split("\n")
            .filter((l) => l.trim().length > 0)
            .slice(-15)
            .map((l) =>
              `    ${colors.red("│")} ${clampLine(linkifyErrors(l))}`
            );

          if (errLines.length > 0) {
            console.log(errLines.join("\n"));
            console.log("");
          }
        }

        if (headless) {
          console.log(
            `  ${chevron()} ${colors.gray(rec.plan.engine)} ${
              colors.bold(rec.target.name)
            } ${rec.badge} (${rec.durationStr || "failed"})`,
          );
        }

        // Redraw updated table
        if (tty) {
          const updatedTbl = buildTableLines(stateRecords, "", options.isBench);
          console.log(updatedTbl.join("\n"));
          tableHeight = updatedTbl.length;
        }

        if (evaluation.isErr && options.failFast) {
          break;
        }
      }
    }
  } finally {
    if (tty) {
      showCursor();
    }
  }

  // Final Summary Banner
  const totalElapsedMs = Date.now() - suiteStartMs;
  const totalDurSuffix = ` ${
    colors.gray(`(total: ${formatDuration(totalElapsedMs)})`)
  }`;

  if (totalErrors > 0) {
    console.log(
      `\n${
        banner(`${options.failMsg(totalErrors)}${totalDurSuffix}`, "196")
      }\n`,
    );
  } else {
    console.log(
      `\n${banner(`${options.successMsg}${totalDurSuffix}`, "48")}\n`,
    );
  }

  return {
    totalErrors,
    totalElapsedMs,
    success: totalErrors === 0,
    results: stateRecords,
  };
}
