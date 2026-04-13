export interface GeoPoint {
	lat: number;
	lng: number;
}

export interface GeoAddress extends GeoPoint {
	address: string;
}

export interface Zone {
	id: string;
	name: string;
}
