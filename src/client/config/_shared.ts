import type { AliasOptions } from "vite-plus";

interface RuntimeEnv {
	Deno?: {
		readDirSync: (
			path: string,
		) => Iterable<{ isDirectory: boolean; name: string }>;
	};
	process?: {
		cwd?: () => string;
	};
}

/**
 * Resolves the root directory of the current process / workspace
 */
export function getAppRoot(): string {
	const env = globalThis as unknown as RuntimeEnv;
	return env.process?.cwd?.() ?? ".";
}

/**
 * Creates standard #lib aliases for a package or application root.
 * Maps:
 *   #lib   -> <root>/src/lib/mod.ts
 *   #lib/* -> <root>/src/lib/*
 */
export function createLibAliases(root: string = getAppRoot()): AliasOptions {
	const libDir = root ? `${root}/src/lib` : "./src/lib";
	return [
		{ find: /^#lib\/(.*)/, replacement: `${libDir}/$1` },
		{ find: "#lib", replacement: `${libDir}/mod.ts` },
	];
}

/**
 * Discovers all project subdirectories in a directory path
 */
export function discoverDirs(dirPath: string): string[] {
	const env = globalThis as unknown as RuntimeEnv;
	try {
		if (env.Deno?.readDirSync) {
			const dirs: string[] = [];
			for (const entry of env.Deno.readDirSync(dirPath)) {
				if (entry.isDirectory) {
					dirs.push(entry.name);
				}
			}
			return dirs;
		}
	} catch {
		// Directory does not exist or cannot be read
	}
	return [];
}
