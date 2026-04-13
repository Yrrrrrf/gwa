export interface Business {
	id: string;
	name: string;
	category: string;
	address: string;
	rating: number;
	lat: number;
	lng: number;
	open: boolean;
}

export interface BusinessProfile {
	name: string;
	owner_name: string;
	zone: string;
	address: string;
	phone: string;
	email: string;
	description: string;
	hours: string;
	category: string;
}

export interface BusinessSummary {
	id: string;
	name: string;
	owner: string;
	zone: string;
	category: string;
	dish_count: number;
	sales: number;
	status: "active" | "inactive" | "pending";
}
