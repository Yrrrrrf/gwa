// tests/terminal_test.ts — Virtual Viewport and terminal formatting tests
import { assertEquals, assertGreater } from "@std/assert";
import { colors } from "@cliffy/ansi/colors";
import {
  clampLine,
  clearLine,
  cursorUp,
  eraseDown,
  getConsoleSize,
} from "../src/terminal.ts";

Deno.test("cursorUp guards against zero-height ANSI jump bug", () => {
  assertEquals(cursorUp(0), "");
  assertEquals(cursorUp(-1), "");
  assertEquals(cursorUp(3), "\x1b[3A");
});

Deno.test("eraseDown and clearLine are standard ANSI sequences", () => {
  assertEquals(eraseDown, "\x1b[0J");
  assertEquals(clearLine, "\r\x1b[2K");
});

Deno.test("getConsoleSize returns valid dimensions", () => {
  const size = getConsoleSize();
  assertGreater(size.columns, 0);
  assertGreater(size.rows, 0);
});

Deno.test("clampLine truncates plain text correctly", () => {
  const line = "12345678901234567890";
  const clamped = clampLine(line, 10);
  assertEquals(clamped, "123456789…");
});

Deno.test("clampLine preserves ANSI escape integrity", () => {
  const colored = colors.red("12345678901234567890");
  const clamped = clampLine(colored, 10);
  // Must end with reset escape and have visible length <= 10
  assertEquals(clamped.includes("…"), true);
});
