import { describe, expect, it } from "vite-plus/test";
import { createAuthStore } from "./auth.svelte.ts";

describe("authStore", () => {
	it("initializes with null user and role", () => {
		const auth = createAuthStore();
		expect(auth.user).toBeNull();
		expect(auth.role).toBeNull();
		expect(auth.isAuthenticated).toBe(false);
	});

	it("updates user and role", () => {
		const auth = createAuthStore();
		auth.setUser({ id: "1", email: "test@example.com", role: "admin" });
		auth.setRole("admin");
		expect(auth.user?.email).toBe("test@example.com");
		expect(auth.role).toBe("admin");
		expect(auth.isAuthenticated).toBe(true);
	});

	it("clears state on logout", () => {
		const auth = createAuthStore();
		auth.setUser({ id: "1", email: "test@example.com", role: "admin" });
		auth.logout();
		expect(auth.user).toBeNull();
		expect(auth.isAuthenticated).toBe(false);
	});
});
