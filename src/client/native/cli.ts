import {
	basename,
	dirname,
	isAbsolute,
	join,
	relative,
	resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

export const CLIENT_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"..",
);
const ACTIONS = [
	"list",
	"init",
	"build",
	"dev",
	"cycle",
	"fmt",
	"info",
	"paths",
	"frontend",
];
const ARCHES = ["aarch64", "armv7", "i686", "x86_64"];
const SLUG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export interface Options {
	action: string;
	app?: string;
	target: "android" | "desktop" | "ios" | "both" | "all";
	arch: string;
	release: boolean;
	debug: boolean;
	dryRun: boolean;
	mode?: "build" | "dev";
	exportMethod?: "debugging" | "release-testing" | "app-store-connect";
}
interface Entry {
	identifier: string;
	productName?: string;
	directory?: string;
	frontendDist: string;
	icon?: string;
	port?: number;
	tauri?: Record<string, unknown>;
}
export interface App {
	slug: string;
	entry: Entry;
	directory: string;
	dist: string;
	icon: string;
	version: string;
	authors: string[];
	license: string;
	tasks: Record<string, string>;
	project: string;
	host: string;
	frontend: string;
	output: string;
	targetDirectory: string;
}
export interface Invocation {
	command: string;
	args: string[];
	cwd: string;
	env?: Record<string, string>;
}
export type Execute = (invocation: Invocation) => Promise<void>;
type Target = "android" | "desktop" | "ios";
export interface Artifact {
	target: Target | "spa";
	path: string;
}

function object(value: unknown, label: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${label} must be a JSON object`);
	}
	return value as Record<string, unknown>;
}
function text(value: unknown, label: string): string {
	if (typeof value !== "string" || !value.trim()) {
		throw new Error(`${label} must be a nonempty string`);
	}
	return value;
}
function inside(parent: string, value: string, label: string): string {
	if (isAbsolute(value)) throw new Error(`${label} must be relative`);
	const path = resolve(parent, value);
	const part = relative(parent, path);
	if (
		!part ||
		part === ".." ||
		part.startsWith(`..${Deno.build.os === "windows" ? "\\" : "/"}`) ||
		isAbsolute(part)
	) {
		throw new Error(`${label} must stay inside ${parent}`);
	}
	return path;
}
async function exists(path: string): Promise<boolean> {
	try {
		await Deno.stat(path);
		return true;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) return false;
		throw error;
	}
}
async function json(path: string): Promise<Record<string, unknown>> {
	return object(JSON.parse(await Deno.readTextFile(path)), path);
}
export function merge(
	base: Record<string, unknown>,
	patch: Record<string, unknown>,
): Record<string, unknown> {
	const result = { ...base };
	for (const [key, value] of Object.entries(patch)) {
		const previous = result[key];
		result[key] =
			value &&
			previous &&
			typeof value === "object" &&
			typeof previous === "object" &&
			!Array.isArray(value) &&
			!Array.isArray(previous)
				? merge(object(previous, key), object(value, key))
				: value;
	}
	return result;
}

export function parseArgs(args: string[]): Options {
	const options: Options = {
		action: args[0] ?? "help",
		target: ["build", "cycle"].includes(args[0])
			? Deno.build.os === "darwin"
				? "all"
				: "both"
			: "android",
		arch: "aarch64",
		release: false,
		debug: false,
		dryRun: false,
	};
	if (
		options.action === "help" ||
		args.includes("--help") ||
		args.includes("-h")
	) {
		return { ...options, action: "help" };
	}
	if (!ACTIONS.includes(options.action)) {
		throw new Error(`Unknown action: ${options.action}`);
	}
	let index = 1;
	if (args[index] && !args[index].startsWith("-")) options.app = args[index++];
	const seen = new Set<string>();
	while (index < args.length) {
		const flag = args[index++];
		if (seen.has(flag)) throw new Error(`Repeated option: ${flag}`);
		seen.add(flag);
		if (flag === "--release") options.release = true;
		else if (flag === "--debug") options.debug = true;
		else if (flag === "--dry-run") options.dryRun = true;
		else if (
			["--target", "--arch", "--mode", "--export-method"].includes(flag)
		) {
			const value = args[index++];
			if (!value || value.startsWith("--")) {
				throw new Error(`Missing value for ${flag}`);
			}
			if (flag === "--target") {
				if (!["android", "desktop", "ios", "both", "all"].includes(value)) {
					throw new Error("Target must be android, desktop, ios, both or all");
				}
				options.target = value as Options["target"];
			} else if (flag === "--arch") {
				if (!ARCHES.includes(value)) {
					throw new Error(`Architecture must be one of ${ARCHES.join(", ")}`);
				}
				options.arch = value;
			} else if (flag === "--export-method") {
				if (
					!["debugging", "release-testing", "app-store-connect"].includes(value)
				) {
					throw new Error("Invalid iOS export method");
				}
				options.exportMethod = value as Options["exportMethod"];
			} else {
				if (value !== "build" && value !== "dev") {
					throw new Error("Mode must be build or dev");
				}
				options.mode = value;
			}
		} else throw new Error(`Unknown option: ${flag}`);
	}
	if (options.app && !SLUG.test(options.app)) {
		throw new Error("App must be a simple registry name, such as minimal");
	}
	if (!["list", "fmt"].includes(options.action) && !options.app) {
		throw new Error("Specify an app from native/apps.json");
	}
	if (options.action === "list" && options.app) {
		throw new Error("list does not accept an app");
	}
	if (seen.has("--mode") !== (options.action === "frontend")) {
		throw new Error("--mode is required only for the frontend hook");
	}
	if (
		["both", "all"].includes(options.target) &&
		!["build", "cycle"].includes(options.action)
	) {
		throw new Error("--target both/all applies to build or cycle only");
	}
	if (seen.has("--arch") && options.target === "desktop") {
		throw new Error("--arch applies to Android only, including --target both");
	}
	if (options.target === "ios" && options.arch !== "aarch64") {
		throw new Error("iOS package builds use the aarch64 device target");
	}
	if (
		options.exportMethod &&
		(!["ios", "all"].includes(options.target) ||
			!["build", "cycle"].includes(options.action))
	) {
		throw new Error("--export-method applies to iOS build/cycle only");
	}
	if (options.release && !["build", "cycle"].includes(options.action)) {
		throw new Error("--release applies to build or cycle");
	}
	if (options.debug && !["build", "cycle"].includes(options.action)) {
		throw new Error("--debug applies to build or cycle");
	}
	if (options.debug && options.release) {
		throw new Error("Choose --debug or --release");
	}
	if (options.action === "frontend" && seen.has("--dry-run")) {
		throw new Error("The frontend hook does not support --dry-run");
	}
	return options;
}

async function registry(root: string): Promise<Record<string, Entry>> {
	const entries = await json(join(root, "native", "apps.json"));
	const identifiers = new Set<string>();
	for (const [slug, raw] of Object.entries(entries)) {
		if (!SLUG.test(slug)) throw new Error(`Invalid registry name: ${slug}`);
		const entry = object(raw, slug);
		const allowed = [
			"identifier",
			"productName",
			"directory",
			"frontendDist",
			"icon",
			"port",
			"tauri",
		];
		for (const key of Object.keys(entry)) {
			if (!allowed.includes(key)) {
				throw new Error(`Unknown native setting: ${slug}.${key}`);
			}
		}
		const id = text(entry.identifier, `${slug}.identifier`);
		if (!/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(id)) {
			throw new Error(
				`${slug}.identifier must be a portable lowercase reverse-domain identifier`,
			);
		}
		if (identifiers.has(id)) {
			throw new Error(`Duplicate native identifier: ${id}`);
		}
		identifiers.add(id);
		text(entry.frontendDist, `${slug}.frontendDist`);
		for (const key of ["productName", "directory", "icon"]) {
			if (entry[key] !== undefined) text(entry[key], `${slug}.${key}`);
		}
		if (
			entry.port !== undefined &&
			(!Number.isInteger(entry.port) ||
				Number(entry.port) < 1024 ||
				Number(entry.port) > 65534)
		) {
			throw new Error(`${slug}.port must be an integer from 1024 to 65534`);
		}
		if (entry.tauri !== undefined) {
			const overrides = object(entry.tauri, `${slug}.tauri`);
			for (const key of Object.keys(overrides)) {
				if (!["app", "bundle", "plugins"].includes(key)) {
					throw new Error(`${slug}.tauri.${key} is managed by the runner`);
				}
			}
			if (
				overrides.bundle &&
				Object.hasOwn(object(overrides.bundle, "bundle"), "icon")
			) {
				throw new Error(
					"Set icon on the registry entry, rather than tauri.bundle.icon",
				);
			}
		}
	}
	return entries as unknown as Record<string, Entry>;
}

async function cacheDirectory(root: string, slug: string): Promise<string> {
	const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE");
	const base =
		Deno.env.get("GWA_NATIVE_CACHE_DIR") ??
		Deno.env.get("XDG_CACHE_HOME") ??
		(Deno.build.os === "windows" ? Deno.env.get("LOCALAPPDATA") : undefined) ??
		(home ? join(home, ".cache") : undefined);
	if (!base) {
		throw new Error(
			"Set GWA_NATIVE_CACHE_DIR to a cache directory outside the client",
		);
	}
	const client = await Deno.realPath(root);
	const resolved = resolve(base);
	const cache = (await exists(resolved))
		? await Deno.realPath(resolved)
		: resolved;
	const part = relative(client, cache);
	const outside =
		part === ".." ||
		part.startsWith(`..${Deno.build.os === "windows" ? "\\" : "/"}`) ||
		isAbsolute(part);
	if (!part || !outside) {
		throw new Error(
			"GWA_NATIVE_CACHE_DIR must be outside the client cleanup tree",
		);
	}
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(client),
	);
	const namespace = Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	)
		.join("")
		.slice(0, 20);
	return join(cache, "gwa-native", namespace, slug, "target");
}

export function buildTargets(
	options: Options,
	platform = Deno.build.os,
): Target[] {
	if (["ios", "all"].includes(options.target) && platform !== "darwin") {
		throw new Error(
			"iOS builds require macOS with Xcode; use --target both on NixOS",
		);
	}
	return options.target === "all"
		? ["desktop", "android", "ios"]
		: options.target === "both"
			? ["desktop", "android"]
			: [options.target];
}

async function prepareCache(app: App): Promise<void> {
	const legacy = join(app.host, "target");
	await Deno.mkdir(dirname(app.targetDirectory), { recursive: true });
	if ((await exists(legacy)) && !(await exists(app.targetDirectory))) {
		try {
			await Deno.rename(legacy, app.targetDirectory);
			console.log(`Reused Cargo cache: ${app.targetDirectory}`);
		} catch (error) {
			// Different filesystems cannot rename a cache; keep the old tree intact.
			console.warn(`Previous Cargo cache kept at ${legacy}: ${String(error)}`);
			console.log(`Cargo cache will be populated at: ${app.targetDirectory}`);
		}
	}
}

export async function readApp(root: string, slug: string): Promise<App> {
	if (!SLUG.test(slug)) throw new Error("Invalid app name");
	const entries = await registry(root);
	const entry = entries[slug];
	if (!entry) {
		throw new Error(
			`Unknown app: ${slug}. Registered: ${Object.keys(entries).join(", ")}`,
		);
	}
	const directory = inside(
		join(root, "apps"),
		entry.directory ?? slug,
		"App directory",
	);
	const realDirectory = await Deno.realPath(directory);
	const realApps = await Deno.realPath(join(root, "apps"));
	inside(realApps, relative(realApps, realDirectory), "App directory");
	const metadata = await json(join(directory, "deno.json"));
	const version = text(metadata.version, `${slug} version in deno.json`);
	if (!VERSION.test(version)) {
		throw new Error(`${slug} needs a semantic version in deno.json`);
	}
	const dist = inside(directory, entry.frontendDist, "Frontend output");
	const icon = inside(
		root,
		entry.icon ? join("native", entry.icon) : "native/host/icons/icon.png",
		"Native icon",
	);
	if (!(await exists(icon))) {
		throw new Error(`Native icon does not exist: ${icon}. Use an RGBA PNG.`);
	}
	if (!icon.toLowerCase().endsWith(".png")) {
		throw new Error(
			"Native icon must be a PNG; convert other formats before registering them",
		);
	}
	const authors = metadata.authors ?? [];
	if (
		!Array.isArray(authors) ||
		authors.some((author) => typeof author !== "string")
	)
		throw new Error("App authors must be strings");
	const tasks =
		metadata.tasks === undefined ? {} : object(metadata.tasks, "App tasks");
	const project = join(root, "native", "projects", slug);
	return {
		slug,
		entry,
		directory,
		dist,
		icon,
		version,
		authors: authors as string[],
		license:
			metadata.license === undefined
				? "MIT"
				: text(metadata.license, "App license"),
		tasks: tasks as Record<string, string>,
		project,
		host: join(project, "src-tauri"),
		frontend: join(project, "frontend"),
		output: join(directory, "build"),
		targetDirectory: await cacheDirectory(root, slug),
	};
}

export async function configuration(
	root: string,
	app: App,
): Promise<Record<string, unknown>> {
	const base = await json(join(root, "native", "host", "tauri.conf.json"));
	const windows = object(base.app, "app").windows as Record<string, unknown>[];
	windows[0].title = app.entry.productName ?? app.slug;
	const config = merge(base, app.entry.tauri ?? {});
	const port = app.entry.port ?? 1420;
	return merge(config, {
		productName: app.entry.productName ?? app.slug,
		identifier: app.entry.identifier,
		version: app.version,
		build: {
			beforeDevCommand: {
				script: `deno run -A --config native/deno.json native/cli.ts frontend ${app.slug} --mode dev`,
				cwd: root,
			},
			beforeBuildCommand: {
				script: `deno run -A --config native/deno.json native/cli.ts frontend ${app.slug} --mode build`,
				cwd: root,
			},
			devUrl: `http://localhost:${port}`,
			frontendDist: app.frontend,
		},
		bundle: { icon: ["icons/icon.png"] },
	});
}

async function writeChanged(
	path: string,
	value: string | Uint8Array,
): Promise<void> {
	const bytes =
		typeof value === "string" ? new TextEncoder().encode(value) : value;
	if (await exists(path)) {
		const previous = await Deno.readFile(path);
		if (
			previous.length === bytes.length &&
			previous.every((byte, i) => byte === bytes[i])
		)
			return;
	}
	await Deno.mkdir(dirname(path), { recursive: true });
	await Deno.writeFile(path, bytes);
}

/** Refresh runner-owned files only. Keep generated Android source/customizations. */
export async function materialize(root: string, app: App): Promise<void> {
	const identityFile = join(app.project, "identity.json");
	const identity = {
		identifier: app.entry.identifier,
		productName: app.entry.productName ?? app.slug,
	};
	if (await exists(identityFile)) {
		const previous = await json(identityFile);
		if (
			previous.identifier !== identity.identifier ||
			previous.productName !== identity.productName
		) {
			throw new Error(
				"Native identity changed. Back up this app's generated project and migrate it explicitly, or register a new app name.",
			);
		}
	}
	const template = join(root, "native", "host");
	// Gradle's generated BuildTask invokes `deno task tauri` from this workspace.
	// Keep that callback app-local while deriving its command from the shared pin.
	const tooling = await json(join(root, "native", "deno.json"));
	const bridge = {
		workspace: [],
		nodeModulesDir: tooling.nodeModulesDir ?? "auto",
		tasks: {
			tauri: text(
				object(tooling.tasks, "Native tasks").tauri,
				"Native tauri task",
			),
		},
	};
	await writeChanged(
		join(app.project, "deno.json"),
		JSON.stringify(bridge, null, 2) + "\n",
	);
	let manifest = await Deno.readTextFile(join(template, "Cargo.toml"));
	manifest = manifest
		.replace('name = "gwa-native"', `name = "gwa-${app.slug}"`)
		.replace('version = "0.0.1"', `version = "${app.version}"`)
		.replace(/^authors = .*$/m, `authors = ${JSON.stringify(app.authors)}`)
		.replace(/^license = .*$/m, `license = ${JSON.stringify(app.license)}`);
	const lock = (await Deno.readTextFile(join(template, "Cargo.lock"))).replace(
		'name = "gwa-native"\nversion = "0.0.1"',
		`name = "gwa-${app.slug}"\nversion = "${app.version}"`,
	);
	await writeChanged(join(app.host, "Cargo.toml"), manifest);
	await writeChanged(join(app.host, "Cargo.lock"), lock);
	for (const file of ["build.rs", "src/main.rs", "src/lib.rs"]) {
		await writeChanged(
			join(app.host, file),
			await Deno.readFile(join(template, file)),
		);
	}
	await writeChanged(
		join(app.host, "icons/icon.png"),
		await Deno.readFile(app.icon),
	);
	await writeChanged(
		join(app.host, "tauri.conf.json"),
		JSON.stringify(await configuration(root, app), null, 2) + "\n",
	);
	await writeChanged(identityFile, JSON.stringify(identity, null, 2) + "\n");
}

class ProcessError extends Error {
	constructor(
		public code: number,
		invocation: Invocation,
	) {
		super(
			`Command failed (${code}): ${invocation.command} ${invocation.args.join(
				" ",
			)}`,
		);
	}
}
export async function execute(invocation: Invocation): Promise<void> {
	console.log(`> ${invocation.command} ${invocation.args.join(" ")}`);
	const child = new Deno.Command(invocation.command, {
		args: invocation.args,
		cwd: invocation.cwd,
		env: invocation.env,
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	}).spawn();
	const interrupt = () => {
		try {
			child.kill(Deno.build.os === "windows" ? "SIGTERM" : "SIGINT");
		} catch {
			/* The child may already have exited. */
		}
	};
	Deno.addSignalListener("SIGINT", interrupt);
	try {
		const status = await child.status;
		if (!status.success) throw new ProcessError(status.code || 1, invocation);
	} finally {
		Deno.removeSignalListener("SIGINT", interrupt);
	}
}

async function withLock(
	app: App,
	callback: () => Promise<void>,
): Promise<void> {
	await Deno.mkdir(app.project, { recursive: true });
	const path = join(app.project, "operation.lock");
	let lock: Deno.FsFile;
	try {
		lock = await Deno.open(path, { write: true, createNew: true });
	} catch (error) {
		if (error instanceof Deno.errors.AlreadyExists) {
			throw new Error(
				`Another operation owns ${path}. If a previous process was killed, confirm it has stopped before removing that lock.`,
			);
		}
		throw error;
	}
	try {
		const bytes = new TextEncoder().encode(`pid=${Deno.pid}\n`);
		for (let offset = 0; offset < bytes.length; ) {
			offset += await lock.write(bytes.subarray(offset));
		}
		await callback();
	} finally {
		lock.close();
		await Deno.remove(path);
	}
}

async function tauri(
	root: string,
	app: App,
	args: string[],
	run: Execute,
): Promise<void> {
	await run({
		command: Deno.execPath(),
		args: [
			"task",
			"--config",
			join(root, "native/deno.json"),
			"--cwd",
			app.project,
			"tauri",
			...args,
		],
		cwd: app.project,
		env: { CARGO_TARGET_DIR: app.targetDirectory },
	});
}
async function rustTargets(
	arch: string,
	cwd: string,
	run: Execute,
): Promise<void> {
	const targets: Record<string, string> = {
		aarch64: "aarch64-linux-android",
		armv7: "armv7-linux-androideabi",
		i686: "i686-linux-android",
		x86_64: "x86_64-linux-android",
	};
	await run({ command: "rustup", args: ["target", "add", targets[arch]], cwd });
}
async function initialize(
	root: string,
	app: App,
	arch: string,
	run: Execute,
): Promise<void> {
	await rustTargets(arch, app.project, run);
	if (!(await exists(join(app.host, "gen/android/gradlew")))) {
		await tauri(
			root,
			app,
			["android", "init", "--ci", "--skip-targets-install"],
			run,
		);
	}
}
async function frontend(
	app: App,
	mode: "build" | "dev",
	run: Execute,
): Promise<void> {
	const args = app.tasks[mode]
		? [
				"task",
				"--config",
				join(app.directory, "deno.json"),
				"--cwd",
				app.directory,
				mode,
			]
		: [
				"run",
				"-A",
				"--config",
				join(app.directory, "deno.json"),
				"npm:vite",
				mode,
			];
	if (mode === "dev") {
		args.push(
			"--port",
			String(app.entry.port ?? 1420),
			"--strictPort",
			"--host",
			Deno.env.get("TAURI_DEV_HOST") || "127.0.0.1",
		);
	}
	await run({ command: Deno.execPath(), args, cwd: app.directory });
}
async function checkOutput(app: App): Promise<void> {
	if (!(await exists(join(app.dist, "index.html")))) {
		throw new Error(
			`Frontend build must produce ${join(
				app.dist,
				"index.html",
			)}. This native host needs a static frontend.`,
		);
	}
	const directory = await Deno.realPath(app.directory);
	inside(
		directory,
		relative(directory, await Deno.realPath(app.dist)),
		"Frontend output",
	);
}
async function artifacts(directory: string, suffix: string): Promise<string[]> {
	if (!(await exists(directory))) return [];
	const files: string[] = [];
	for await (const entry of Deno.readDir(directory)) {
		const path = join(directory, entry.name);
		if (entry.isDirectory) files.push(...(await artifacts(path, suffix)));
		else if (entry.isFile && entry.name.endsWith(suffix)) files.push(path);
	}
	return files.sort();
}

async function copyTree(
	source: string,
	destination: string,
	synchronize = false,
): Promise<void> {
	const names = new Set<string>();
	await Deno.mkdir(destination, { recursive: true });
	for await (const entry of Deno.readDir(source)) {
		names.add(entry.name);
		const from = join(source, entry.name);
		const to = join(destination, entry.name);
		if (synchronize && (await exists(to))) {
			const previous = await Deno.stat(to);
			if (
				(entry.isDirectory && !previous.isDirectory) ||
				(entry.isFile && !previous.isFile)
			) {
				await Deno.remove(to, { recursive: true });
			}
		}
		if (entry.isDirectory) await copyTree(from, to, synchronize);
		else if (entry.isFile) {
			if (synchronize) await writeChanged(to, await Deno.readFile(from));
			else await Deno.copyFile(from, to);
		} else {
			throw new Error(`Static output contains an unsupported symlink: ${from}`);
		}
	}
	if (synchronize) {
		for await (const entry of Deno.readDir(destination)) {
			if (!names.has(entry.name)) {
				await Deno.remove(join(destination, entry.name), { recursive: true });
			}
		}
	}
}

async function snapshotFrontend(app: App): Promise<void> {
	await checkOutput(app);
	await copyTree(app.dist, app.frontend, true);
}

/** Preserve the last published output while Vite writes its ordinary build directory. */
async function prepareFrontend(
	app: App,
	run: Execute,
	reuse: boolean,
): Promise<void> {
	if (reuse) {
		await snapshotFrontend(app);
		return;
	}
	if (app.dist !== app.output) {
		await frontend(app, "build", run);
		await snapshotFrontend(app);
		return;
	}
	const temporary = await Deno.makeTempDir({
		dir: app.project,
		prefix: ".frontend-",
	});
	const previous = join(temporary, "previous");
	const hadPrevious = await exists(app.output);
	try {
		if (hadPrevious) await Deno.rename(app.output, previous);
		try {
			await frontend(app, "build", run);
			await snapshotFrontend(app);
		} finally {
			if (await exists(app.output)) {
				await Deno.remove(app.output, { recursive: true });
			}
			if (await exists(previous)) await Deno.rename(previous, app.output);
		}
	} finally {
		if (await exists(previous)) {
			console.warn(`Previous output retained for recovery: ${previous}`);
		} else if (await exists(temporary)) {
			await Deno.remove(temporary, { recursive: true });
		}
	}
}

function artifactName(app: App, output: Artifact): string {
	if (output.target === "spa") return "spa";
	const name = `gwa-${app.slug}`;
	if (output.target === "desktop") {
		return `${name}${Deno.build.os === "windows" ? ".exe" : ""}`;
	}
	return `${name}-${app.version}.${
		output.target === "android" ? "apk" : "ipa"
	}`;
}

async function publishedArtifacts(app: App): Promise<Artifact[]> {
	if (!(await exists(app.output))) return [];
	const outputs: Artifact[] = [];
	if (await exists(join(app.output, "spa/index.html"))) {
		outputs.push({ target: "spa", path: join(app.output, "spa") });
	}
	const name = `gwa-${app.slug}`;
	for await (const entry of Deno.readDir(app.output)) {
		if (!entry.isFile) continue;
		const target =
			entry.name === `${name}${Deno.build.os === "windows" ? ".exe" : ""}`
				? "desktop"
				: entry.name.startsWith(`${name}-`) && entry.name.endsWith(".apk")
					? "android"
					: entry.name.startsWith(`${name}-`) && entry.name.endsWith(".ipa")
						? "ios"
						: undefined;
		if (target) outputs.push({ target, path: join(app.output, entry.name) });
	}
	return outputs.sort((a, b) =>
		a.target === "spa"
			? -1
			: b.target === "spa"
				? 1
				: a.path.localeCompare(b.path),
	);
}

/** Publish one SPA and flat native files after every requested target succeeds. */
async function publishArtifacts(
	app: App,
	outputs: Artifact[],
): Promise<Artifact[]> {
	const staging = await Deno.makeTempDir({
		dir: app.directory,
		prefix: ".native-build-",
	});
	const backup = `${staging}.previous`;
	const spa: Artifact = { target: "spa", path: join(app.output, "spa") };
	try {
		await copyTree(app.frontend, join(staging, "spa"));
		const updated = new Set(outputs.map((output) => output.target));
		const retained = (await publishedArtifacts(app)).filter(
			(output) => output.target !== "spa" && !updated.has(output.target),
		);
		for (const output of retained) {
			await Deno.copyFile(output.path, join(staging, basename(output.path)));
		}
		for (const output of outputs) {
			await Deno.copyFile(
				output.path,
				join(staging, artifactName(app, output)),
			);
		}
		if (await exists(app.output)) await Deno.rename(app.output, backup);
		try {
			await Deno.rename(staging, app.output);
		} catch (error) {
			if (await exists(backup)) await Deno.rename(backup, app.output);
			throw error;
		}
		if (await exists(backup)) await Deno.remove(backup, { recursive: true });
		return [
			spa,
			...outputs.map((output) => ({
				target: output.target,
				path: join(app.output, artifactName(app, output)),
			})),
		];
	} finally {
		if (await exists(staging)) await Deno.remove(staging, { recursive: true });
	}
}

export function artifactSummary(
	app: App,
	outputs: Artifact[],
	heading = "Build complete",
	color = !Deno.noColor && Deno.stdout.isTerminal(),
): string {
	const paint = (value: string, code: string) =>
		color ? `\x1b[${code}m${value}\x1b[0m` : value;
	return [
		"",
		paint(`${heading} · ${app.entry.productName ?? app.slug}`, "1;32"),
		`  Output  ${paint(app.output, "36")}`,
		...outputs.map(
			(output) =>
				`  ${paint(
					output.target === "spa"
						? "SPA"
						: output.target === "android"
							? "APK"
							: output.target === "ios"
								? "IPA"
								: "APP",
					"1;33",
				)}     ${paint(output.path, "36")}`,
		),
	].join("\n");
}

async function initializeIos(
	root: string,
	app: App,
	run: Execute,
): Promise<void> {
	await run({
		command: "rustup",
		args: ["target", "add", "aarch64-apple-ios"],
		cwd: app.project,
	});
	const directory = join(app.host, "gen/apple");
	const initialized =
		(await exists(directory)) &&
		Array.from(Deno.readDirSync(directory)).some(
			(entry) => entry.isDirectory && entry.name.endsWith(".xcodeproj"),
		);
	if (!initialized) {
		await tauri(
			root,
			app,
			["ios", "init", "--ci", "--skip-targets-install"],
			run,
		);
	}
}

async function buildTarget(
	root: string,
	app: App,
	options: Options,
	target: Target,
	run: Execute,
): Promise<Artifact[]> {
	const args = target === "desktop" ? ["build"] : [target, "build"];
	if (target === "android") {
		await initialize(root, app, options.arch, run);
		args.push("--apk", "--target", options.arch);
		if (!options.release) args.push("--debug");
	} else if (target === "ios") {
		await initializeIos(root, app, run);
		args.push(
			"--target",
			"aarch64",
			"--export-method",
			options.exportMethod ?? "debugging",
		);
		if (!options.release) args.push("--debug");
	} else {
		args.push("--no-bundle");
		if (options.debug) args.push("--debug");
	}
	// This invocation has already built or verified the SPA. Direct Tauri usage keeps its hook.
	args.push(
		"--config",
		JSON.stringify({ build: { beforeBuildCommand: null } }),
	);
	await tauri(root, app, args, run);
	const profile =
		target === "desktop"
			? options.debug
				? "debug"
				: "release"
			: options.release
				? "release"
				: "debug";
	const binary = join(
		app.targetDirectory,
		profile,
		`gwa-${app.slug}${Deno.build.os === "windows" ? ".exe" : ""}`,
	);
	const outputs =
		target === "android"
			? await artifacts(
					join(
						app.host,
						"gen/android/app/build/outputs/apk/universal",
						profile,
					),
					".apk",
				)
			: target === "ios"
				? await artifacts(
						join(app.targetDirectory, "aarch64-apple-ios", profile),
						".ipa",
					)
				: (await exists(binary)) && (await Deno.stat(binary)).isFile
					? [binary]
					: [];
	if (outputs.length !== 1) {
		throw new Error(
			`The ${target} command completed without exactly one expected application artifact`,
		);
	}
	return outputs.map((path) => ({ target, path }));
}

export async function runNative(
	root: string,
	options: Options,
	run: Execute = execute,
	platform = Deno.build.os,
): Promise<void> {
	if (options.action === "list") {
		for (const [slug, entry] of Object.entries(await registry(root))) {
			console.log(`${slug}\t${entry.identifier}\t${entry.frontendDist}`);
		}
		return;
	}
	if (options.action === "fmt") {
		await run({
			command: "cargo",
			args: [
				"fmt",
				"--manifest-path",
				join(root, "native/host/Cargo.toml"),
				"--all",
				"--",
				"--check",
			],
			cwd: root,
		});
		return;
	}
	const app = await readApp(root, options.app!);
	if (options.action === "paths") {
		const outputs = await publishedArtifacts(app);
		if (!outputs.length) {
			throw new Error(
				`No published artifacts. Run native build ${app.slug} first.`,
			);
		}
		console.log(artifactSummary(app, outputs, "Build artifacts"));
		return;
	}
	if (options.action === "frontend") {
		if (options.mode === "build") {
			await Deno.mkdir(app.project, { recursive: true });
			await prepareFrontend(app, run, false);
		} else await frontend(app, "dev", run);
		return;
	}
	if (options.dryRun) {
		console.log(
			JSON.stringify(
				{
					action: options.action,
					target: options.target,
					arch: options.arch,
					app: app.slug,
					project: app.project,
					outputDirectory: app.output,
					cargoTargetDirectory: app.targetDirectory,
					config: await configuration(root, app),
				},
				null,
				2,
			),
		);
		return;
	}
	const selected =
		options.action === "info" ? [] : buildTargets(options, platform);
	if (options.action === "cycle") {
		// Relocate a previous local cache before the existing **/build prune can touch it.
		if (await exists(join(app.host, "target"))) {
			await withLock(app, () => prepareCache(app));
		}
		await run({
			command: "just",
			args: ["--justfile", join(root, "justfile"), "cycle"],
			cwd: root,
		});
		await runNative(root, { ...options, action: "fmt" }, run);
	}
	await withLock(app, async () => {
		await materialize(root, app);
		await prepareCache(app);
		if (options.action === "info") {
			await tauri(root, app, ["info"], run);
			return;
		}
		const action = options.action === "cycle" ? "build" : options.action;
		if (action === "build") {
			await prepareFrontend(app, run, options.action === "cycle");
			const outputs: Artifact[] = [];
			for (const target of selected) {
				outputs.push(...(await buildTarget(root, app, options, target, run)));
			}
			console.log(artifactSummary(app, await publishArtifacts(app, outputs)));
			return;
		}
		if (options.target === "android") {
			await initialize(root, app, options.arch, run);
		} else if (options.target === "ios") {
			await initializeIos(root, app, run);
		}
		if (options.action === "init") {
			console.log(`Native project ready: ${app.project}`);
			return;
		}
		if (action === "dev" && options.target === "android") {
			// The device chooser may select any ABI; prepare all supported Rust targets.
			for (const arch of ARCHES.filter((arch) => arch !== options.arch)) {
				await rustTargets(arch, app.project, run);
			}
		}
		if (action === "dev" && options.target === "ios") {
			await run({
				command: "rustup",
				args: ["target", "add", "aarch64-apple-ios-sim", "x86_64-apple-ios"],
				cwd: app.project,
			});
		}
		const args =
			options.target === "desktop" ? [action] : [options.target, action];
		await tauri(root, app, args, run);
	});
}

const HELP = `GWA native
  deno task --config native/deno.json native <action> [app] [options]

Actions: list, init, build, dev, cycle, fmt, info, paths
Options: --target both|android|desktop|ios|all (build/cycle default both; others android)
         --arch aarch64|armv7|i686|x86_64 (default aarch64)
         --release (Android build/cycle; desktop builds already use release)
         --debug (desktop build/cycle; Android already defaults to debug)
         --export-method debugging|release-testing|app-store-connect (iOS)
         --dry-run (inspect configuration without writing or building)

All native configuration lives in native/apps.json.
Android init is automatic on the first build/dev. Generated projects persist in
native/projects/<app>. Enter the matching Nix shell before native compilation.
Builds publish apps/<app>/build/{spa/,gwa-<app>,gwa-<app>-<version>.apk,.ipa}.
The SPA is built once; cycle reuses its web output. Cargo caches live outside cleanup.
iOS and --target all require macOS with Xcode and Apple signing configuration.
Use nix develop .#android for both targets, or .#desktop for desktop alone.
`;

if (import.meta.main) {
	try {
		const options = parseArgs(Deno.args);
		if (options.action === "help") console.log(HELP);
		else await runNative(CLIENT_ROOT, options);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		Deno.exit(error instanceof ProcessError ? error.code : 1);
	}
}
