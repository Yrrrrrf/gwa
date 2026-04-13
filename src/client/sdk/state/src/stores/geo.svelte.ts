import { type Zone } from "@sdk/core";

// READY(db): DB city table + fn::businesses_near.
export function createGeoStore() {
	const zones = $state<Zone[]>([
		{ id: "z1", name: "Zona Centro Histórico" },
		{ id: "z2", name: "Zona Costera Norte" },
		{ id: "z3", name: "Zona Estadio Principal" },
		{ id: "z4", name: "Zona Mercado Tradicional" },
		{ id: "z5", name: "Zona Fan Fest" },
	]);

	let currentZoneId = $state("z1");

	return {
		get allZones() {
			return zones;
		},
		get currentZone() {
			return zones.find((z) => z.id === currentZoneId);
		},
		setZone(id: string) {
			currentZoneId = id;
		},
	};
}
