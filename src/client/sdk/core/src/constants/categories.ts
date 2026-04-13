export const DISH_CATEGORIES = [
	{ key: "mexican", label: "Mexicana", color: "orange" },
	{ key: "seafood", label: "Mariscos", color: "blue" },
	{ key: "street_food", label: "Antojitos", color: "yellow" },
	{ key: "drinks", label: "Bebidas", color: "purple" },
	{ key: "desserts", label: "Postres", color: "pink" },
	{ key: "international", label: "Comida Internacional", color: "indigo" },
	{ key: "vegetarian", label: "Vegetariano", color: "green" },
	{ key: "fast_food", label: "Fast Food", color: "red" },
] as const;

export type DishCategoryKey = (typeof DISH_CATEGORIES)[number]["key"];
