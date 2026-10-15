import { dirname, join } from "node:path";
import {
  artifactSummary,
  buildTargets,
  configuration,
  execute,
  type Invocation,
  materialize,
  merge,
  parseArgs,
  readApp,
  runNative,
} from "./cli.ts";

function assert(value: unknown, message = "Assertion failed"): asserts value {
  if (!value) throw new Error(message);
}
async function rejects(callback: () => unknown, fragment: string) {
  try {
    await callback();
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes(fragment),
      String(error),
    );
    return;
  }
  throw new Error(`Expected failure containing ${fragment}`);
}
async function fixture(): Promise<string> {
  const root = await Deno.makeTempDir({ prefix: "gwa native " });
  await Deno.mkdir(join(root, "native/host/src"), { recursive: true });
  await Deno.mkdir(join(root, "native/host/icons"), { recursive: true });
  for (
    const [path, value] of Object.entries({
      "native/apps.json": JSON.stringify({
        minimal: {
          identifier: "dev.gwa.minimal",
          productName: "Minimal",
          frontendDist: "build",
        },
        react: {
          identifier: "dev.gwa.react",
          productName: "React",
          frontendDist: "dist",
        },
      }),
      "native/host/Cargo.toml":
        '[package]\nname = "gwa-native"\nversion = "0.0.1"\nauthors = []\nlicense = "MIT"\n',
      "native/host/Cargo.lock":
        '[[package]]\nname = "gwa-native"\nversion = "0.0.1"\n',
      "native/host/build.rs": "fn main() {}\n",
      "native/host/src/main.rs": "fn main() {}\n",
      "native/host/src/lib.rs": "pub fn run() {}\n",
      "native/host/tauri.conf.json": JSON.stringify({
        app: {
          windows: [{ label: "main", title: "Native" }],
          security: { csp: "default-src 'self'" },
        },
        build: {},
        bundle: { active: false },
      }),
      "native/deno.json": JSON.stringify({
        workspace: [],
        nodeModulesDir: "auto",
        tasks: { tauri: "deno run -A npm:@tauri-apps/cli@2.12.1" },
      }),
    })
  ) await Deno.writeTextFile(join(root, path), value);
  await Deno.writeFile(
    join(root, "native/host/icons/icon.png"),
    new Uint8Array([1, 2, 3]),
  );
  for (
    const [slug, metadata] of Object.entries({
      minimal: {
        version: "0.0.1",
        tasks: { build: "app build", dev: "app dev" },
      },
      react: {
        version: "0.1.2",
        authors: ["A developer"],
        license: "Apache-2.0",
      },
    })
  ) {
    await Deno.mkdir(join(root, "apps", slug), { recursive: true });
    await Deno.writeTextFile(
      join(root, "apps", slug, "deno.json"),
      JSON.stringify(metadata),
    );
  }
  return root;
}
async function temporary(callback: (root: string) => Promise<void>) {
  const root = await fixture();
  const cache = await Deno.makeTempDir({ prefix: "gwa native cache " });
  const previous = Deno.env.get("GWA_NATIVE_CACHE_DIR");
  Deno.env.set("GWA_NATIVE_CACHE_DIR", cache);
  try {
    await callback(root);
  } finally {
    await Deno.remove(root, { recursive: true });
    await Deno.remove(cache, { recursive: true });
    if (previous === undefined) Deno.env.delete("GWA_NATIVE_CACHE_DIR");
    else Deno.env.set("GWA_NATIVE_CACHE_DIR", previous);
  }
}
async function publish(invocation: Invocation): Promise<void> {
  if (!invocation.args.includes("tauri")) {
    if (invocation.args.includes("build") || invocation.command === "just") {
      const directory = invocation.command === "just"
        ? join(invocation.cwd, "apps/minimal/build")
        : join(
          invocation.cwd,
          invocation.cwd.endsWith("react") ? "dist" : "build",
        );
      await Deno.mkdir(join(directory, "assets"), { recursive: true });
      await Deno.writeTextFile(join(directory, "index.html"), "SPA content");
      await Deno.writeTextFile(join(directory, "assets/app.js"), "SPA asset");
    }
    return;
  }
  if (invocation.args.includes("init")) {
    const directory = join(
      invocation.cwd,
      "src-tauri/gen",
      invocation.args.includes("ios") ? "apple/App.xcodeproj" : "android",
    );
    await Deno.mkdir(directory, { recursive: true });
    if (invocation.args.includes("android")) {
      await Deno.writeTextFile(join(directory, "gradlew"), "generated");
    }
    return;
  }
  if (!invocation.args.includes("build")) return;
  const mobile = invocation.args.includes("android") ||
    invocation.args.includes("ios");
  const profile = invocation.args.includes("--debug") ? "debug" : "release";
  const path = invocation.args.includes("android")
    ? join(
      invocation.cwd,
      "src-tauri/gen/android/app/build/outputs/apk/universal",
      profile,
      `app-universal-${profile}.apk`,
    )
    : invocation.args.includes("ios")
    ? join(
      invocation.env!.CARGO_TARGET_DIR,
      "aarch64-apple-ios",
      profile,
      "App.ipa",
    )
    : join(
      invocation.env!.CARGO_TARGET_DIR,
      profile,
      `gwa-minimal${Deno.build.os === "windows" ? ".exe" : ""}`,
    );
  await Deno.mkdir(join(path, ".."), { recursive: true });
  await Deno.writeTextFile(
    path,
    mobile ? "mobile artifact" : "desktop artifact",
  );
  if (!mobile && Deno.build.os !== "windows") await Deno.chmod(path, 0o751);
}
function options(action: string, extra: string[] = []) {
  return parseArgs([action, "minimal", ...extra]);
}

Deno.test("CLI rejects traversal, unknown options, malformed targets and missing hook modes", async () => {
  for (
    const [args, message] of [
      [["build", "../minimal"], "simple registry"],
      [["build", "minimal", "--target", "bad"], "Target"],
      [["build", "minimal", "--arch", "mips"], "Architecture"],
      [["build", "minimal", "--unknown"], "Unknown option"],
      [["build", "minimal", "--target"], "Missing value"],
      [["frontend", "minimal"], "--mode"],
      [["dev", "minimal", "--release"], "--release"],
      [["dev", "minimal", "--target", "both"], "build or cycle only"],
      [
        ["build", "minimal", "--target", "desktop", "--arch", "x86_64"],
        "Android only",
      ],
    ] as [string[], string][]
  ) await rejects(() => parseArgs(args), message);
  assert(parseArgs(["--help"]).action === "help");
  assert(options("build").target === "both");
  assert(options("cycle").target === "both");
  assert(options("dev").target === "android");
  assert(
    options("build", ["--target", "both", "--arch", "x86_64"]).arch ===
      "x86_64",
  );
});

Deno.test("different frontend frameworks generate isolated identity, versions, assets and Cargo metadata", async () => {
  await temporary(async (root) => {
    const first = await readApp(root, "minimal");
    const second = await readApp(root, "react");
    await materialize(root, first);
    await materialize(root, second);
    const bridge = JSON.parse(
      await Deno.readTextFile(join(second.project, "deno.json")),
    );
    assert(
      Object.keys(bridge.tasks).length === 1 &&
        bridge.tasks.tauri.includes("@2.12.1"),
    );
    assert(Array.isArray(bridge.workspace) && bridge.workspace.length === 0);
    const a = await configuration(root, first);
    const b = await configuration(root, second);
    assert(a.identifier !== b.identifier);
    assert(a.version === "0.0.1" && b.version === "0.1.2");
    assert(
      JSON.stringify(a).includes(
        join(root, "native/projects/minimal/frontend"),
      ),
    );
    assert(
      JSON.stringify(b).includes(join(root, "native/projects/react/frontend")),
    );
    const manifest = await Deno.readTextFile(join(second.host, "Cargo.toml"));
    assert(manifest.includes('name = "gwa-react"'));
    assert(manifest.includes('version = "0.1.2"'));
    assert(manifest.includes("A developer") && manifest.includes("Apache-2.0"));
    assert(
      (await Deno.readTextFile(join(second.host, "Cargo.lock"))).includes(
        'name = "gwa-react"',
      ),
    );
    assert(!JSON.stringify(b).includes(first.directory));
  });
});

Deno.test("materialization preserves Android customizations, is idempotent and refuses identity changes", async () => {
  await temporary(async (root) => {
    const app = await readApp(root, "minimal");
    await materialize(root, app);
    const gradle = join(app.host, "gen/android/app/build.gradle.kts");
    await Deno.mkdir(join(app.host, "gen/android/app"), { recursive: true });
    await Deno.writeTextFile(gradle, "// signing customization");
    const config = join(app.host, "tauri.conf.json");
    const before = (await Deno.stat(config)).mtime;
    await materialize(root, app);
    assert((await Deno.stat(config)).mtime?.getTime() === before?.getTime());
    assert((await Deno.readTextFile(gradle)) === "// signing customization");
    app.entry.identifier = "dev.gwa.changed";
    await rejects(() => materialize(root, app), "identity changed");
  });
});

Deno.test("registry rejects duplicate identities and output escape paths", async () => {
  await temporary(async (root) => {
    const path = join(root, "native/apps.json");
    const entries = JSON.parse(await Deno.readTextFile(path));
    entries.react.identifier = entries.minimal.identifier;
    await Deno.writeTextFile(path, JSON.stringify(entries));
    await rejects(() => readApp(root, "minimal"), "Duplicate");
    entries.react.identifier = "dev.gwa.react";
    entries.minimal.frontendDist = "../../secret";
    await Deno.writeTextFile(path, JSON.stringify(entries));
    await rejects(() => readApp(root, "minimal"), "must stay inside");
  });
});

Deno.test("dry run invokes no tools and creates no generated project", async () => {
  await temporary(async (root) => {
    let calls = 0;
    await runNative(root, options("build", ["--dry-run"]), () => {
      calls++;
      return Promise.resolve();
    });
    assert(calls === 0);
    await rejects(
      () => Deno.stat(join(root, "native/projects")),
      "No such file",
    );
  });
});

Deno.test("Android initializes once, selects requested target and preserves debug/release flags", async () => {
  await temporary(async (root) => {
    const calls: Invocation[] = [];
    const run = async (invocation: Invocation) => {
      calls.push(invocation);
      await publish(invocation);
      if (invocation.args.includes("init")) {
        const app = await readApp(root, "minimal");
        await Deno.mkdir(join(app.host, "gen/android"), { recursive: true });
        await Deno.writeTextFile(
          join(app.host, "gen/android/gradlew"),
          "generated",
        );
      }
    };
    await runNative(
      root,
      options("build", ["--target", "android", "--arch", "x86_64"]),
      run,
    );
    const build = calls.find((call) =>
      call.args.includes("tauri") && call.args.includes("build")
    )!;
    assert(
      build.args.includes("--apk") && build.args.includes("--debug") &&
        build.args.includes("x86_64"),
    );
    assert(
      calls.some((call) =>
        call.command === "rustup" && call.args.includes("x86_64-linux-android")
      ),
    );
    assert(build.cwd.endsWith("native/projects/minimal"));
    calls.length = 0;
    await runNative(
      root,
      options("build", ["--target", "android", "--release"]),
      run,
    );
    assert(!calls.some((call) => call.args.includes("init")));
    assert(!calls.at(-1)!.args.includes("--debug"));
  });
});

Deno.test("cycle failure prevents native generation and successful cycle precedes native checks/build", async () => {
  await temporary(async (root) => {
    await rejects(
      () =>
        runNative(
          root,
          options("cycle"),
          () => Promise.reject(new Error("web gate failed")),
        ),
      "web gate failed",
    );
    await rejects(
      () => Deno.stat(join(root, "native/projects")),
      "No such file",
    );
    const calls: Invocation[] = [];
    await runNative(
      root,
      options("cycle", ["--target", "desktop"]),
      (invocation) => {
        calls.push(invocation);
        return publish(invocation);
      },
    );
    assert(calls[0].command === "just");
    assert(calls[0].cwd === root && calls[0].args.at(-1) === "cycle");
    assert(calls[1].command === "cargo" && calls[1].args.includes("--check"));
    assert(calls[2].args.includes("--no-bundle"));
  });
});

Deno.test("failed native processes release the operation lock and concurrent operations are rejected", async () => {
  await temporary(async (root) => {
    const app = await readApp(root, "minimal");
    await rejects(
      () =>
        runNative(
          root,
          options("build", ["--target", "desktop"]),
          () => Promise.reject(new Error("native failed")),
        ),
      "native failed",
    );
    await rejects(
      () => Deno.stat(join(app.project, "operation.lock")),
      "No such file",
    );
    await Deno.writeTextFile(join(app.project, "operation.lock"), "busy");
    await rejects(
      () =>
        runNative(
          root,
          options("init", ["--target", "desktop"]),
          () => Promise.resolve(),
        ),
      "Another operation",
    );
  });
});

Deno.test("frontend hook uses existing tasks or Vite fallback and verifies static output", async () => {
  await temporary(async (root) => {
    const calls: Invocation[] = [];
    const run = (invocation: Invocation) => {
      calls.push(invocation);
      return Promise.resolve();
    };
    await rejects(
      () =>
        runNative(
          root,
          parseArgs(["frontend", "minimal", "--mode", "build"]),
          run,
        ),
      "must produce",
    );
    assert(
      calls[0].args[0] === "task" && calls[0].cwd.endsWith("apps/minimal"),
    );
    await runNative(
      root,
      parseArgs(["frontend", "react", "--mode", "dev"]),
      run,
    );
    assert(
      calls[1].args.includes("npm:vite") &&
        calls[1].args.includes("--strictPort"),
    );
    assert(calls[1].args.includes("1420"));
  });
});

Deno.test("desktop debug uses the debug artifact and missing artifacts fail the build", async () => {
  await temporary(async (root) => {
    const calls: Invocation[] = [];
    await runNative(
      root,
      options("build", ["--target", "desktop", "--debug"]),
      (invocation) => {
        calls.push(invocation);
        return publish(invocation);
      },
    );
    assert(
      calls.find((call) => call.args.includes("tauri"))!.args.includes(
        "--debug",
      ),
    );
    assert(
      calls.find((call) => call.args.includes("tauri"))!.env?.CARGO_TARGET_DIR
        .endsWith("minimal/target"),
    );
    const app = await readApp(root, "minimal");
    assert(
      (await Deno.stat(
        join(
          app.targetDirectory,
          "debug",
          `gwa-minimal${Deno.build.os === "windows" ? ".exe" : ""}`,
        ),
      )).isFile,
    );
    const copied = join(
      root,
      "apps/minimal/build",
      `gwa-minimal${Deno.build.os === "windows" ? ".exe" : ""}`,
    );
    assert(await Deno.readTextFile(copied) === "desktop artifact");
    if (Deno.build.os !== "windows") {
      assert(((await Deno.stat(copied)).mode! & 0o777) === 0o751);
    }
    await rejects(
      () =>
        runNative(
          root,
          options("build", ["--target", "desktop"]),
          (invocation) =>
            invocation.args.includes("tauri")
              ? Promise.resolve()
              : publish(invocation),
        ),
      "expected application artifact",
    );
  });
});

Deno.test("default build runs both targets and publishes their files only after both succeed", async () => {
  await temporary(async (root) => {
    const app = await readApp(root, "minimal");
    const calls: Invocation[] = [];
    await runNative(root, options("build"), async (invocation) => {
      calls.push(invocation);
      // No copied artifacts are exposed while either build is still running.
      await rejects(() => Deno.stat(app.output), "No such file");
      await publish(invocation);
    });
    const builds = calls.filter((call) =>
      call.args.includes("tauri") && call.args.includes("build")
    );
    assert(builds.length === 2);
    assert(builds[0].args.includes("--no-bundle"));
    assert(!builds[0].args.includes("--debug"));
    assert(
      builds[1].args.includes("android") && builds[1].args.includes("--debug"),
    );
    assert(
      await Deno.readTextFile(
        join(app.output, "gwa-minimal-0.0.1.apk"),
      ) === "mobile artifact",
    );
    assert(
      await Deno.readTextFile(
        join(
          app.output,
          `gwa-minimal${Deno.build.os === "windows" ? ".exe" : ""}`,
        ),
      ) === "desktop artifact",
    );
  });
});

Deno.test("single-target publication replaces older APKs, ignores split outputs and preserves the app", async () => {
  await temporary(async (root) => {
    await runNative(root, options("build"), publish);
    const app = await readApp(root, "minimal");
    const split = join(
      app.host,
      "gen/android/app/build/outputs/apk/arm64/release/stale.apk",
    );
    await Deno.mkdir(join(split, ".."), { recursive: true });
    await Deno.writeTextFile(split, "old ABI");
    await runNative(
      root,
      options("build", ["--target", "android", "--release"]),
      publish,
    );
    const files = Array.from(Deno.readDirSync(app.output));
    assert(files.filter((entry) => entry.name.endsWith(".apk")).length === 1);
    assert(files.some((entry) => entry.name === "gwa-minimal-0.0.1.apk"));
    assert(
      await Deno.readTextFile(
        join(
          app.output,
          `gwa-minimal${Deno.build.os === "windows" ? ".exe" : ""}`,
        ),
      ) === "desktop artifact",
    );
    assert(
      !Array.from(Deno.readDirSync(app.host)).some((entry) =>
        entry.name.startsWith(".build-")
      ),
    );
  });
});

Deno.test("a failed second build keeps the previous published pair intact", async () => {
  await temporary(async (root) => {
    await runNative(root, options("build"), publish);
    const app = await readApp(root, "minimal");
    const desktop = join(
      app.output,
      `gwa-minimal${Deno.build.os === "windows" ? ".exe" : ""}`,
    );
    const apk = join(app.output, "gwa-minimal-0.0.1.apk");
    await Deno.writeTextFile(desktop, "previous desktop");
    await Deno.writeTextFile(apk, "previous APK");
    await rejects(
      () =>
        runNative(root, options("build"), async (invocation) => {
          if (
            invocation.args.includes("android") &&
            invocation.args.includes("build")
          ) {
            throw new Error("APK failed");
          }
          await publish(invocation);
        }),
      "APK failed",
    );
    assert(await Deno.readTextFile(desktop) === "previous desktop");
    assert(await Deno.readTextFile(apk) === "previous APK");
    await rejects(
      () => Deno.stat(join(app.project, "operation.lock")),
      "No such file",
    );
  });
});

Deno.test("paths reports copied artifacts without running any build tools or generating files", async () => {
  await temporary(async (root) => {
    const run = () => Promise.reject(new Error("paths must not execute tools"));
    await rejects(
      () => runNative(root, options("paths"), run),
      "No published artifacts",
    );
    await rejects(
      () => Deno.stat(join(root, "native/projects")),
      "No such file",
    );
    await runNative(root, options("build"), publish);
    const messages: string[] = [];
    const log = console.log;
    console.log = (...args: unknown[]) => messages.push(args.join(" "));
    try {
      await runNative(root, options("paths"), run);
    } finally {
      console.log = log;
    }
    assert(messages.length === 1 && messages[0].includes("Build artifacts"));
    assert(
      messages[0].includes("build/spa") &&
        messages[0].includes("gwa-minimal-0.0.1.apk"),
    );
    assert(!messages[0].includes("target/release"));
  });
});

Deno.test("artifact summary supports colored terminals and clean plain-text output", async () => {
  await temporary(async (root) => {
    const app = await readApp(root, "minimal");
    const outputs = [{
      target: "android" as const,
      path: join(app.output, "gwa-minimal-0.0.1.apk"),
    }];
    const colored = artifactSummary(app, outputs, "Build complete", true);
    const plain = artifactSummary(app, outputs, "Build complete", false);
    assert(colored.includes("\x1b[1;32m") && colored.includes("\x1b[36m"));
    assert(!plain.includes("\x1b[") && plain.includes(outputs[0].path));
  });
});

Deno.test("apps need no tasks: one frontend build serves both targets and produces flat named outputs", async () => {
  await temporary(async (root) => {
    const metadataPath = join(root, "apps/minimal/deno.json");
    const metadata = JSON.parse(await Deno.readTextFile(metadataPath));
    delete metadata.tasks;
    await Deno.writeTextFile(metadataPath, JSON.stringify(metadata));
    const calls: Invocation[] = [];
    await runNative(root, options("build"), async (invocation) => {
      calls.push(invocation);
      await publish(invocation);
    });
    const frontend = calls.filter((call) => call.cwd.endsWith("apps/minimal"));
    assert(frontend.length === 1 && frontend[0].args.includes("npm:vite"));
    const native = calls.filter((call) =>
      call.args.includes("tauri") && call.args.includes("build")
    );
    assert(native.length === 2);
    for (const invocation of native) {
      const config = JSON.parse(
        invocation
          .args[
            invocation.args.indexOf(
              "--config",
              invocation.args.indexOf("tauri"),
            ) + 1
          ],
      );
      assert(config.build.beforeBuildCommand === null);
    }
    const app = await readApp(root, "minimal");
    assert(
      await Deno.readTextFile(join(app.output, "spa/index.html")) ===
        "SPA content",
    );
    assert(
      await Deno.readTextFile(join(app.output, "spa/assets/app.js")) ===
        "SPA asset",
    );
    const directories = Array.from(Deno.readDirSync(app.output)).filter((
      entry,
    ) => entry.isDirectory);
    assert(directories.length === 1 && directories[0].name === "spa");
    assert(
      await Deno.readTextFile(join(app.output, "gwa-minimal-0.0.1.apk")) ===
        "mobile artifact",
    );
    assert((await Deno.stat(join(app.project, "identity.json"))).isFile);
  });
});

Deno.test("cycle reuses its web output instead of invoking another frontend build", async () => {
  await temporary(async (root) => {
    const calls: Invocation[] = [];
    await runNative(root, options("cycle"), async (invocation) => {
      calls.push(invocation);
      await publish(invocation);
    });
    assert(calls[0].command === "just" && calls[0].args.at(-1) === "cycle");
    assert(!calls.some((call) => call.cwd.endsWith("apps/minimal")));
    const app = await readApp(root, "minimal");
    assert(
      await Deno.readTextFile(join(app.output, "spa/index.html")) ===
        "SPA content",
    );
  });
});

Deno.test("unchanged SPA files keep their timestamps and obsolete assets are removed", async () => {
  await temporary(async (root) => {
    await runNative(root, options("build"), publish);
    const app = await readApp(root, "minimal");
    const index = join(app.frontend, "index.html");
    const before = (await Deno.stat(index)).mtime;
    await Deno.writeTextFile(join(app.frontend, "obsolete.js"), "obsolete");
    await runNative(root, options("build"), publish);
    assert((await Deno.stat(index)).mtime?.getTime() === before?.getTime());
    await rejects(
      () => Deno.stat(join(app.frontend, "obsolete.js")),
      "No such file",
    );
    assert(
      !Array.from(Deno.readDirSync(app.frontend)).some((entry) =>
        entry.name.endsWith(".apk")
      ),
    );
  });
});

Deno.test("legacy Cargo cache moves outside the cleanup tree and survives a simulated prune", async () => {
  await temporary(async (root) => {
    const app = await readApp(root, "minimal");
    const marker = join(app.host, "target/release/build/cache-marker");
    await Deno.mkdir(dirname(marker), { recursive: true });
    await Deno.writeTextFile(marker, "cached build script");
    const relocated = join(app.targetDirectory, "release/build/cache-marker");
    await runNative(root, options("cycle"), async (invocation) => {
      if (invocation.command === "just") {
        assert(await Deno.readTextFile(relocated) === "cached build script");
      }
      await publish(invocation);
    });
    assert(await Deno.readTextFile(relocated) === "cached build script");
    assert(!app.targetDirectory.startsWith(root));
    await runNative(root, options("cycle"), async (invocation) => {
      if (invocation.command === "just") {
        await Deno.remove(app.output, { recursive: true });
      }
      await publish(invocation);
    });
    assert(await Deno.readTextFile(relocated) === "cached build script");
  });
});

Deno.test("frontend failure restores the previous complete published output", async () => {
  await temporary(async (root) => {
    await runNative(root, options("build"), publish);
    const app = await readApp(root, "minimal");
    await rejects(
      () =>
        runNative(root, options("build"), async (invocation) => {
          if (invocation.cwd === app.directory) {
            await Deno.mkdir(app.output, { recursive: true });
            await Deno.writeTextFile(
              join(app.output, "partial.txt"),
              "partial",
            );
            throw new Error("frontend failed");
          }
          await publish(invocation);
        }),
      "frontend failed",
    );
    assert(
      await Deno.readTextFile(join(app.output, "spa/index.html")) ===
        "SPA content",
    );
    assert(
      await Deno.readTextFile(join(app.output, "gwa-minimal-0.0.1.apk")) ===
        "mobile artifact",
    );
    await rejects(
      () => Deno.stat(join(app.output, "partial.txt")),
      "No such file",
    );
  });
});

Deno.test("iOS requires macOS and an explicit Apple stage publishes a versioned IPA", async () => {
  const ios = options("build", ["--target", "ios"]);
  await rejects(() => buildTargets(ios, "linux"), "require macOS");
  assert(
    buildTargets(options("build", ["--target", "all"]), "darwin").join(",") ===
      "desktop,android,ios",
  );
  await temporary(async (root) => {
    const calls: Invocation[] = [];
    await runNative(root, ios, async (invocation) => {
      calls.push(invocation);
      await publish(invocation);
    }, "darwin");
    const build = calls.find((call) =>
      call.args.includes("ios") && call.args.includes("build")
    )!;
    assert(
      build.args.includes("--export-method") &&
        build.args.includes("debugging"),
    );
    const app = await readApp(root, "minimal");
    assert(
      await Deno.readTextFile(join(app.output, "gwa-minimal-0.0.1.ipa")) ===
        "mobile artifact",
    );
  });
});

Deno.test("subprocess failures retain their actual exit code", async () => {
  try {
    await execute({
      command: Deno.execPath(),
      args: ["eval", "--no-config", "Deno.exit(7)"],
      cwd: Deno.cwd(),
    });
    throw new Error("Expected subprocess failure");
  } catch (error) {
    assert(error instanceof Error && "code" in error && error.code === 7);
  }
});

Deno.test("nested overrides merge objects and replace permission/window arrays", () => {
  const result = merge({
    app: { windows: [1], security: { csp: "original", capabilities: [1] } },
  }, { app: { windows: [2], security: { capabilities: [2] } } });
  const app = result.app as {
    windows: number[];
    security: { csp: string; capabilities: number[] };
  };
  assert(app.windows.length === 1 && app.windows[0] === 2);
  assert(app.security.csp === "original" && app.security.capabilities[0] === 2);
});
