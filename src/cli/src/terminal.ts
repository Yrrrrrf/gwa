// terminal.ts — Virtual Viewport, ANSI Screen Navigation & Cursor Hygiene
// Guarantees zero escape leaks, safe cursor restore, and headless CI mode

import { ansi } from "jsr:@cliffy/ansi@1.2.1";
import { stripAnsiCode } from "jsr:@std/fmt@1.0.10/colors";
import { relative } from "jsr:@std/path@1.0.8";

export function isTTY(): boolean {
  try {
    return Deno.stdout.isTerminal();
  } catch {
    return false;
  }
}

export function isHeadlessCI(): boolean {
  if (!isTTY()) return true;
  const ciEnv = Deno.env.get("CI");
  const term = Deno.env.get("TERM");
  return ciEnv === "true" || ciEnv === "1" || term === "dumb";
}

/**
 * Checks whether the terminal has sufficient vertical space for in-place table redraws.
 * If the required rows exceed terminal height minus safety margins, degrades to clean linear append-only mode.
 */
export function shouldDegradeToLinear(requiredRows: number): boolean {
  if (isHeadlessCI()) return true;
  const consoleRows = getConsoleSize().rows;
  return requiredRows >= consoleRows - 2;
}

/**
 * Creates an OSC 8 terminal hyperlink for clickable file/line navigation.
 * Terminals supporting OSC 8 (VS Code, iTerm, WezTerm, Alacritty, GNOME, foot)
 * will make the text clickable, while others gracefully display the visible text.
 */
export function terminalLink(text: string, url: string): string {
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

/**
 * Scans a text line for file paths with line/column numbers (e.g. `src/mod.ts:12:5`
 * or `file:///abs/path/file.ts:10:4`), renders clean relative path text in the terminal,
 * and enriches them with clickable OSC 8 file:// links pointing to the exact line.
 */
export function linkifyErrors(
  line: string,
  rootDir: string = Deno.cwd(),
): string {
  const fileRegex =
    /(?:file:\/\/)?([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+):(\d+)(?::(\d+))?/g;
  return line.replace(fileRegex, (match, filePath, lineNum, colNum) => {
    try {
      const cleanPath = filePath.replace(/^\/+/, "/").replace(/^\.\//, "");
      const fullPath = cleanPath.startsWith("/")
        ? cleanPath
        : `${rootDir}/${cleanPath}`;
      const relPath = relative(rootDir, fullPath) || cleanPath;
      const url = `file://${fullPath}#L${lineNum}`;
      const display = colNum
        ? `${relPath}:${lineNum}:${colNum}`
        : `${relPath}:${lineNum}`;
      return terminalLink(display, url);
    } catch {
      return match;
    }
  });
}

/**
 * Moves cursor up N lines.
 * Guards against the ANSI VT100 / ECMA-48 zero-height bug where `\e[0A` erroneously moves up 1 line.
 */
export function cursorUp(lines: number): string {
  return lines > 0 ? ansi.cursorUp(lines).toString() : "";
}

export const eraseDown: string = ansi.eraseDown.toString();
export const clearLine: string = `\r${ansi.eraseLine.toString()}`;

let cursorHidden = false;

export function showCursor(): void {
  if (cursorHidden && isTTY()) {
    try {
      Deno.stdout.writeSync(
        new TextEncoder().encode(ansi.cursorShow.toString()),
      );
    } catch {
      // Ignored if stdout already closed
    }
    cursorHidden = false;
  }
}

export function hideCursor(): void {
  if (!cursorHidden && isTTY() && !isHeadlessCI()) {
    try {
      Deno.stdout.writeSync(
        new TextEncoder().encode(ansi.cursorHide.toString()),
      );
      cursorHidden = true;
    } catch {
      // Ignored if stdout not writable
    }
  }
}

let signalsInstalled = false;

export function installSignalTraps(): void {
  if (signalsInstalled) return;
  signalsInstalled = true;

  globalThis.addEventListener("unload", () => {
    showCursor();
  });

  if (Deno.build.os !== "windows") {
    try {
      Deno.addSignalListener("SIGINT", () => {
        showCursor();
        Deno.exit(130);
      });
      Deno.addSignalListener("SIGTERM", () => {
        showCursor();
        Deno.exit(143);
      });
    } catch {
      // Signal listeners may not be supported in certain sandboxes
    }
  }
}

export function getConsoleSize(): { columns: number; rows: number } {
  try {
    if (Deno.stdout.isTerminal()) {
      const size = Deno.consoleSize();
      return {
        columns: Math.max(size.columns, 40),
        rows: Math.max(size.rows, 10),
      };
    }
  } catch {
    // Fallback if stdout is piped
  }
  return { columns: 80, rows: 24 };
}

/**
 * Strips both ANSI CSI sequences (\x1b[...m) and OSC 8 hyperlink sequences (\x1b]8;;...\x1b\).
 * Used for mathematically accurate visible column measurements.
 */
export function stripAllAnsi(str: string): string {
  // deno-lint-ignore no-control-regex
  return str
    .replace(/\x1b\]8;;[^\x1b]*\x1b\\/g, "")
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

/**
 * Clamps a line to prevent terminal line-wrapping glitches.
 * Preserves ANSI escape and OSC 8 hyperlink integrity if string exceeds width.
 */
export function clampLine(line: string, maxVisibleWidth?: number): string {
  const maxWidth = maxVisibleWidth ??
    Math.max(getConsoleSize().columns - 8, 20);
  const visibleLen = stripAllAnsi(line).length;
  if (visibleLen <= maxWidth) {
    return line;
  }

  // If line has no ANSI escapes, simple slice
  if (line.length === visibleLen) {
    return line.slice(0, maxWidth - 1) + "…";
  }

  // Walk through tokens and truncate at visible boundary
  let curVisible = 0;
  let result = "";
  // Match ANSI CSI escape, OSC 8 escape, or single character
  // deno-lint-ignore no-control-regex
  const regex = /(\x1b\[[0-9;]*[a-zA-Z])|(\x1b\]8;;[^\x1b]*\x1b\\)|([^\x1b])/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match[1]) {
      result += match[1]; // Keep ANSI escape sequence
    } else if (match[2]) {
      result += match[2]; // Keep OSC 8 hyperlink sequence
    } else if (match[3]) {
      if (curVisible < maxWidth - 1) {
        result += match[3];
        curVisible++;
      } else {
        result += "…\x1b]8;;\x1b\\\x1b[0m";
        break;
      }
    }
  }

  return result;
}
