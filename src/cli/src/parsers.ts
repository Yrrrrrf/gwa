// parsers.ts — Built-in diagnostics evaluators and test stats parsers
import { stripAnsiCode } from "jsr:@std/fmt@1.0.10/colors";

export interface DiagnosticStats {
  readonly isErr: boolean;
  readonly errCount: number;
  readonly warnCount: number;
}

export interface TestStats {
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly isErr: boolean;
  readonly errCount: number;
}

/**
 * Parses `deno check` stdout/stderr looking for TS diagnostic errors.
 * Ensures non-zero exit codes always record at least 1 error.
 */
export function parseDenoCheck(
  text: string,
  exitCode: number,
): DiagnosticStats {
  const matches = text.match(/TS\d+\s+\[ERROR\]/g);
  const count = matches ? matches.length : 0;
  const isErr = exitCode !== 0 || count > 0;
  return {
    isErr,
    errCount: isErr ? Math.max(count, 1) : 0,
    warnCount: 0,
  };
}

/**
 * Parses `svelte-check` stdout/stderr looking for errors and warnings.
 * Also checks for fallback TS diagnostics and exit code correctness.
 */
export function parseSvelteCheck(
  text: string,
  exitCode: number,
): DiagnosticStats {
  const svelteErr = text.match(/(?:found|Found)\s+(\d+)\s+error/i);
  const denoErr = text.match(/TS\d+\s+\[ERROR\]/g);
  const parsedErrs = svelteErr
    ? parseInt(svelteErr[1], 10)
    : (denoErr ? denoErr.length : 0);

  const svelteWarn = text.match(/(?:and|Found)\s+(\d+)\s+warning/i);
  const warnCount = svelteWarn ? parseInt(svelteWarn[1], 10) : 0;

  const isErr = exitCode !== 0 || parsedErrs > 0;
  return {
    isErr,
    errCount: isErr ? Math.max(parsedErrs, 1) : 0,
    warnCount,
  };
}

/**
 * Parses test output across Vitest and Deno Test.
 * Scans for the LAST summary line to prevent intermediate streaming lines from corrupting totals.
 */
export function parseTestStats(output: string, exitCode: number): TestStats {
  const clean = stripAnsiCode(output);
  const lines = clean.split("\n");
  const summaryLines = lines.filter(
    (l) =>
      /ok\s+\|/i.test(l) || /FAILED\s+\|/i.test(l) || /Tests\s+/i.test(l) ||
      /passed/i.test(l),
  );
  const summary = summaryLines[summaryLines.length - 1] ?? clean;

  const pMatch = summary.match(/(\d+)\s+passed/);
  const fMatch = summary.match(/(\d+)\s+failed/);
  const sMatch = summary.match(/(\d+)\s+skipped/);

  const passed = pMatch ? parseInt(pMatch[1], 10) : 0;
  let failed = fMatch ? parseInt(fMatch[1], 10) : 0;
  const skipped = sMatch ? parseInt(sMatch[1], 10) : 0;
  if (exitCode !== 0 && failed === 0) failed = 1;

  return {
    passed,
    failed,
    skipped,
    isErr: exitCode !== 0 || failed > 0,
    errCount: failed,
  };
}

/**
 * Utility to extract a numeric count from text using regex capture group.
 */
export function parseCount(text: string, regex: RegExp): number {
  const match = text.match(regex);
  return match && match[1] ? parseInt(match[1], 10) : 0;
}
