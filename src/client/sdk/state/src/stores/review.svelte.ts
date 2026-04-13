import { type Review } from "@sdk/core";

// READY(db): DB review table + events + computed rating.
export function createReviewStore() {
	const reviews = $state<Review[]>([
		{
			id: "r1",
			business_id: "1",
			user_id: "u1",
			rating: 5,
			comment: "¡Los mejores tacos al pastor que he probado!",
			created_at: new Date().toISOString(),
		},
		{
			id: "r2",
			business_id: "1",
			user_id: "u2",
			rating: 4,
			comment: "Muy buenos, pero la salsa estaba muy picante.",
			created_at: new Date().toISOString(),
		},
		{
			id: "r3",
			business_id: "2",
			user_id: "u3",
			rating: 5,
			comment: "Fresh seafood and great view!",
			created_at: new Date().toISOString(),
		},
		{
			id: "r4",
			business_id: "3",
			user_id: "u4",
			rating: 5,
			comment: "Best churros in town.",
			created_at: new Date().toISOString(),
		},
	]);

	let loading = $state(false);
	let error = $state<string | null>(null);

	return {
		get all() {
			return reviews;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		getByBusiness(business_id: string) {
			return reviews.filter((r) => r.business_id === business_id);
		},
	};
}
