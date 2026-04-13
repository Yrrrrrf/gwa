import { type Business, type BusinessProfile, type BusinessSummary } from "@sdk/core";

// READY(db): DB business table is ready. fn::businesses_near for geo.
export function createBusinessStore() {
	const businesses = $state<BusinessSummary[]>([
		{
			id: "1",
			name: "Taquería El Campeón",
			owner: "Carlos Ramírez",
			zone: "Zona Centro Histórico",
			category: "mexican",
			dish_count: 12,
			sales: 412,
			status: "active",
		},
		{
			id: "2",
			name: "La Perla del Mar",
			owner: "Ana García",
			zone: "Zona Costera Norte",
			category: "seafood",
			dish_count: 8,
			sales: 289,
			status: "active",
		},
		{
			id: "3",
			name: "Dulcería Mundial",
			owner: "Pedro Torres",
			zone: "Zona Fan Fest",
			category: "desserts",
			dish_count: 15,
			sales: 198,
			status: "active",
		},
	]);

	let activeProfile = $state<BusinessProfile>({
		name: "Taquería El Campeón",
		owner_name: "Carlos Ramírez",
		zone: "Zona Centro Histórico",
		address: "Calle Libertad #42, Local 3",
		phone: "+52 55 1234 5678",
		email: "campeontacos@ejemplo.com",
		description:
			"Auténtica comida mexicana para los turistas del Mundial. Especialidad en tacos al pastor y quesadillas.",
		hours: "8:00 AM – 10:00 PM",
		category: "mexican",
	});

	let loading = $state(false);
	let error = $state<string | null>(null);

	return {
		get all() {
			return businesses;
		},
		get profile() {
			return activeProfile;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		updateProfile(updated: BusinessProfile) {
			activeProfile = { ...updated };
		},
	};
}
