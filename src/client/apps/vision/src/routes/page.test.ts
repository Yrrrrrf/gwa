import { describe, expect, it } from "vite-plus/test";
import pkg from "../../deno.json" with { type: "json" };

describe("Vision App", () => {
	it("has valid package metadata", () => {
		expect(pkg.name).toBe("@apps/vision");
		expect(pkg.version).toBeDefined();
	});
});
