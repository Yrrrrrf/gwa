// process.ts — In-memory Web Streams process runner
// Zero /tmp disk writes, pipe deadlock prevention, and unbuffered RAM streaming

import { TextLineStream } from "@std/streams";
import type { ProcessResult } from "./types.ts";

export interface SpawnStreamingOptions {
  readonly cmd: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
  readonly onLine?: (line: string, type: "stdout" | "stderr") => void;
}

/**
 * Spawns a child process and streams unbuffered logs through Web Streams in RAM.
 * Guaranteed zero disk I/O and zero pipe buffer deadlocks.
 */
export async function spawnStreamingProcess(
  options: SpawnStreamingOptions,
): Promise<ProcessResult> {
  const [executable, ...args] = options.cmd;
  if (!executable) {
    return {
      stdout: "",
      stderr: "No executable specified in command",
      combined: "No executable specified in command",
      exitCode: 1,
      elapsedMs: 0,
    };
  }

  const startMs = Date.now();

  const command = new Deno.Command(executable, {
    args,
    cwd: options.cwd,
    env: {
      FORCE_COLOR: "1",
      CLICOLOR_FORCE: "1",
      DENO_NO_PROMPT: "1",
      ...options.env,
    },
    stdout: "piped",
    stderr: "piped",
    signal: options.signal,
  });

  const child = command.spawn();

  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  const combinedLines: string[] = [];

  const readStream = async (
    stream: ReadableStream<Uint8Array>,
    type: "stdout" | "stderr",
    targetLines: string[],
  ): Promise<void> => {
    try {
      const lineStream = stream
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(new TextLineStream({ allowCR: true }));

      for await (const line of lineStream) {
        targetLines.push(line);
        combinedLines.push(line);
        options.onLine?.(line, type);
      }
    } catch (_err) {
      // Stream reading might be interrupted if process was killed via signal
    }
  };

  // Consume stdout, stderr, and child status concurrently to prevent OS pipe deadlock
  const [status] = await Promise.all([
    child.status,
    readStream(child.stdout, "stdout", stdoutLines),
    readStream(child.stderr, "stderr", stderrLines),
  ]);

  const elapsedMs = Date.now() - startMs;

  return {
    stdout: stdoutLines.join("\n"),
    stderr: stderrLines.join("\n"),
    combined: combinedLines.join("\n"),
    exitCode: status.code,
    elapsedMs,
  };
}
