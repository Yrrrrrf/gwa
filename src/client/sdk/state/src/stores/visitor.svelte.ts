import { type SavedItem } from "@sdk/core";

// Partial — favorites relation exists for businesses.
// TODO(db): Add user→dish favorites when dish table exists
export function createVisitorStore() {
	const saved = $state<SavedItem[]>([
		{ dish_id: "1", saved_at: new Date().toISOString() },
		{ dish_id: "2", saved_at: new Date().toISOString() },
	]);

	let loading = $state(false);
	let error = $state<string | null>(null);

	return {
		get saved() {
			return saved;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		save(dish_id: string) {
			if (!saved.some((s) => s.dish_id === dish_id)) {
				saved.push({ dish_id, saved_at: new Date().toISOString() });
			}
		},
		remove(dish_id: string) {
			const idx = saved.findIndex((s) => s.dish_id === dish_id);
			if (idx !== -1) saved.splice(idx, 1);
		},
		isSaved(dish_id: string) {
			return saved.some((s) => s.dish_id === dish_id);
		},
	};
}
