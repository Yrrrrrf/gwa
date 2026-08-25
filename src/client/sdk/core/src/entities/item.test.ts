import { assertEquals } from "@std/assert";
import type { Item } from "./item.ts";

Deno.test("Item entity - validates item interface structure", () => {
	const item: Item = {
		id: "item_1",
		title: "Test Item",
		description: "Sample description",
		status: "active",
		tags: ["test", "gwa"],
		coordinates: { lat: 10, lng: 20 },
		rating: 5,
		comment_count: 0,
		created_at: "2026-08-24T00:00:00Z",
		updated_at: "2026-08-24T00:00:00Z",
	};
	assertEquals(item.title, "Test Item");
	assertEquals(item.tags.length, 2);
});
