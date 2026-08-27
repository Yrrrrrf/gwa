// ui.ts — Terminal styling, badges, banners, command templates, and Cliffy Table layout
// Zero escape leaks, mathematically immune column alignment, and native ANSI formatting

import { colors } from "jsr:@cliffy/ansi@1.2.1/colors";
import { Cell, Row, Table } from "jsr:@cliffy/table@1.2.1";
import type { BaseTarget, TaskState } from "./types.ts";

export const SPINNER_FRAMES = [
  "⠋",
  "⠙",
  "⠹",
  "⠸",
  "⠼",
  "⠴",
  "⠦",
  "⠧",
  "⠇",
  "⠏",
];

export function chevron(): string {
  return colors.bold.cyan("❯❯");
}

export function metric(
  n: number,
  label: string,
  color: "green" | "red_bold" | "yellow" | "gray" = "green",
): string {
  if (n > 0) {
    if (color === "green") return colors.green(`${n} ${label}`);
    if (color === "red_bold") return colors.bold.red(`${n} ${label}`);
    if (color === "yellow") return colors.yellow(`${n} ${label}`);
    return colors.gray(`${n} ${label}`);
  }
  return colors.gray(`0 ${label}`);
}

export function badge(
  a: number,
  la: string,
  b: number,
  lb: string,
  c: number,
  lc: string,
): string {
  const sa = la === "files"
    ? colors.gray(`${a} files`)
    : metric(a, la, "green");
  const sb = metric(b, lb, "red_bold");
  const sc = metric(c, lc, "yellow");
  return `(${sa}, ${sb}, ${sc})`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  const sec = (ms / 1000).toFixed(2);
  return `${sec}s`;
}

/**
 * Native ANSI banner — zero external process, zero OSC 11 background leaks.
 */
export function banner(
  text: string,
  colorCode: "212" | "48" | "196" | string = "212",
): void {
  console.log("");
  if (colorCode === "48") {
    console.log(colors.bold.green(text));
  } else if (colorCode === "196") {
    console.log(colors.bold.red(text));
  } else {
    console.log(colors.bold.magenta(text));
  }
}

/**
 * Renders template command: bold italic style with <placeholders> in bold cyan.
 */
export function renderCmdTemplate(text: string): void {
  const styled = text.replace(/<([^>]+)>/g, (_match, token) => {
    return colors.bold.cyan(`<${token}>`);
  });
  console.log("");
  console.log(`  ${colors.bold.italic(styled)}`);
}

/**
 * Renders concrete commands manifest at 0 tabs (no leading indent).
 */
export function renderCmdList(cmds: readonly string[]): void {
  for (const cmd of cmds) {
    const clean = cmd.replace(/<|>/g, "");
    console.log(clean);
  }
}

/**
 * Builds the dashboard table using @cliffy/table for mathematically immune ANSI alignment.
 * Returns an array of formatted strings (one per table line).
 */
export function buildTableLines<TTarget extends BaseTarget, TResult, TContext>(
  records: readonly TaskState<TTarget, TResult, TContext>[],
  frame: string = "",
  _isBench: boolean = false,
): string[] {
  const tableRows: (Row | string[])[] = [];
  let lastCat = "";

  for (const rec of records) {
    const catName = rec.cat || "";
    if (catName && catName !== lastCat) {
      if (lastCat) {
        tableRows.push(new Row(Cell.from("").colSpan(4)));
      }
      tableRows.push(
        new Row(Cell.from(colors.bold.magenta(`[${catName}]`)).colSpan(4)),
      );
      lastCat = catName;
    }

    let statusStr = "";
    if (rec.status === "pending") {
      statusStr = colors.gray("(pending)");
    } else if (rec.status === "running") {
      const startMs = rec.startMs ?? Date.now();
      const elapsed = Date.now() - startMs;
      const liveClock = elapsed > 0
        ? ` ${colors.gray(`(${formatDuration(elapsed)})`)}`
        : "";
      statusStr = `${colors.cyan(frame || "⠋")} ${
        colors.gray("running...")
      }${liveClock}`;
    } else if (rec.status === "skipped") {
      statusStr = rec.badge;
    } else {
      const durTag = rec.durationStr
        ? ` ${colors.gray(`(${rec.durationStr})`)}`
        : "";
      statusStr = `${rec.badge}${durTag}`;
    }

    tableRows.push([
      `  ${chevron()}`,
      colors.gray(rec.plan.engine),
      colors.bold(rec.target.name),
      statusStr,
    ]);
  }

  const tableStr = new Table()
    .body(tableRows)
    .border(false)
    .padding(1)
    .toString();

  return tableStr.split("\n");
}
