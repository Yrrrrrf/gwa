import { describe, expect, it } from "vite-plus/test";
import pkg from "../../deno.json" with { type: "json" };
import { Counter, faviconUrl, Icon } from "../lib/mod.ts";

describe("Svelte App", () => {
	it("has valid package metadata and assets", () => {
		expect(pkg.name).toBe("@apps/minimal");
		expect(typeof faviconUrl).toBe("string");
		expect(Counter).toBeDefined();
		expect(Icon).toBeDefined();
	});
});
