export type UserRole = "user" | "manager" | "admin" | null;

export interface User {
	id: string;
	email: string;
	role: UserRole;
}

export interface AuthStore {
	readonly role: UserRole;
	readonly user: User | null;
	readonly isAuthenticated: boolean;
	setRole(newRole: UserRole): void;
	setUser(newUser: User | null): void;
	logout(): void;
}

// READY(db): DB user table with role validation. JWT from API.
export function createAuthStore(): AuthStore {
	let role = $state<UserRole>(null);
	let user = $state<User | null>(null);

	return {
		get role() {
			return role;
		},
		get user() {
			return user;
		},
		get isAuthenticated() {
			return !!user;
		},
		setRole(newRole: UserRole) {
			role = newRole;
		},
		setUser(newUser: User | null) {
			user = newUser;
		},
		logout() {
			role = null;
			user = null;
		},
	};
}

export const authStore: AuthStore = createAuthStore();
