export interface Nutrition {
	calories: number;
	fat: number;
	protein: number;
	carbs: number;
}

export interface Dish {
	id: string;
	name: string;
	price: number;
	restaurant: string;
	image_url: string;
	category: string;
	rating: number;
	likes: number;
	description?: string;
	ingredients?: string[];
	nutrition?: Nutrition;
	available: boolean;
	sales_count: number;
}

export interface DishFormData {
	name: string;
	price: number;
	category: string;
	description: string;
	image_url: string;
	available: boolean;
}
