import { assert } from "./assert.ts";
export const root = new URL("../../", import.meta.url).pathname.replace(
  /\/$/,
  "",
);
export async function copyTree(source: string, destination: string) {
  await Deno.mkdir(destination, { recursive: true });
  for await (const entry of Deno.readDir(source)) {
    if (entry.isDirectory) {
      await copyTree(`${source}/${entry.name}`, `${destination}/${entry.name}`);
    } else if (entry.isFile) {
      await Deno.copyFile(
        `${source}/${entry.name}`,
        `${destination}/${entry.name}`,
      );
    }
  }
}
export async function template(name: string) {
  const directory = `${root}/.state/lifecycle-${name}-${crypto.randomUUID()}`;
  await Deno.mkdir(`${directory}/engine`, { recursive: true });
  for (const dir of ["config", "db", "scripts"]) {
    await copyTree(`${root}/${dir}`, `${directory}/${dir}`);
  }
  for (
    const file of [
      "justfile",
      "compose.yaml",
      ".containerignore",
      "engine/Cargo.toml",
      "engine/Cargo.lock",
      "engine/build.rs",
      "engine/engine.Dockerfile",
    ]
  ) {
    await Deno.copyFile(`${root}/${file}`, `${directory}/${file}`);
  }
  await copyTree(`${root}/engine/src`, `${directory}/engine/src`);
  return directory;
}
export async function just(
  directory: string,
  args: string[],
  env: Record<string, string> = {},
) {
  const result = await new Deno.Command("just", {
    cwd: directory,
    args,
    env,
    stdout: "piped",
    stderr: "piped",
  }).output();
  return {
    success: result.success,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}
export async function succeeds(
  directory: string,
  args: string[],
  env: Record<string, string>,
) {
  const result = await just(directory, args, env);
  assert(result.success, result.stderr);
  return result;
}

export function availablePorts(): string[] {
  const listeners = Array.from(
    { length: 3 },
    () => Deno.listen({ hostname: "127.0.0.1", port: 0 }),
  );
  try {
    return listeners.map((listener) => String((listener.addr as Deno.NetAddr).port));
  } finally {
    for (const listener of listeners) listener.close();
  }
}
