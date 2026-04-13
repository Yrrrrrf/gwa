import { type Dish } from "@sdk/core";

// TODO(db): No dish table yet. Use hardcoded mock data.
// Replace with SurrealQL query when dish table is added
export function createDishStore() {
	const dishes = $state<Dish[]>([
		{
			id: "1",
			name: "Tacos al Pastor x3",
			price: 7.5,
			restaurant: "Taquería El Campeón",
			image_url:
				"https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80",
			category: "mexican",
			rating: 4.8,
			likes: 234,
			description:
				"Auténticos tacos al pastor con carne de cerdo marinada en achiote, servidos en tortilla de maíz artesanal con piña, cilantro y cebolla.",
			ingredients: [
				"Tortilla de maíz",
				"Carne de cerdo",
				"Achiote",
				"Piña",
				"Cilantro",
				"Cebolla",
				"Salsa verde",
				"Limón",
			],
			nutrition: { calories: 420, protein: 24, fat: 18, carbs: 38 },
			available: true,
			sales_count: 412,
		},
		{
			id: "2",
			name: "Ceviche Mixto Grande",
			price: 12.0,
			restaurant: "La Perla del Mar",
			image_url:
				"https://images.unsplash.com/photo-1599481238640-4c1288750d7a?w=400&q=80",
			category: "seafood",
			rating: 4.9,
			likes: 189,
			description:
				"Ceviche fresco de camarón, pulpo y callo de hacha macerado en limón real, con chile serrano, tomate y pepino crujiente.",
			ingredients: [
				"Camarón",
				"Pulpo",
				"Callo de hacha",
				"Limón",
				"Chile serrano",
				"Tomate",
				"Pepino",
				"Cilantro",
				"Cebolla morada",
			],
			nutrition: { calories: 280, protein: 32, fat: 6, carbs: 14 },
			available: true,
			sales_count: 289,
		},
		{
			id: "3",
			name: "Quesadilla de Flor de Calabaza",
			price: 5.5,
			restaurant: "Antojitos Doña Rosa",
			image_url:
				"https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=400&q=80",
			category: "street_food",
			rating: 4.7,
			likes: 156,
			description:
				"Quesadilla artesanal hecha a mano con masa de maíz azul, rellena de flor de calabaza fresca, epazote y queso Oaxaca fundido.",
			ingredients: [
				"Maíz azul",
				"Flor de calabaza",
				"Queso Oaxaca",
				"Epazote",
				"Chile serrano",
			],
			nutrition: { calories: 310, protein: 14, fat: 12, carbs: 35 },
			available: true,
			sales_count: 567,
		},
		{
			id: "4",
			name: "Margarita de Mango",
			price: 8.0,
			restaurant: "Bar El Faro",
			image_url:
				"https://images.unsplash.com/photo-1536935338788-846bb9981813?w=400&q=80",
			category: "drinks",
			rating: 4.6,
			likes: 120,
			description:
				"Refrescante margarita de mango natural con tequila reposado, un toque de limón y escarchada con chile tajín.",
			ingredients: ["Mango", "Tequila", "Limón", "Triple sec", "Tajín"],
			nutrition: { calories: 220, protein: 0, fat: 0, carbs: 28 },
			available: true,
			sales_count: 890,
		},
		{
			id: "5",
			name: "Churros con Chocolate",
			price: 6.0,
			restaurant: "Dulcería Mundial",
			image_url:
				"https://images.unsplash.com/photo-1571115177098-24ec4209b5d5?w=400&q=80",
			category: "desserts",
			rating: 4.9,
			likes: 310,
			description:
				"Churros crujientes recién hechos, espolvoreados con azúcar y canela, acompañados de una taza de chocolate caliente espeso.",
			ingredients: ["Harina", "Azúcar", "Canela", "Chocolate", "Leche"],
			nutrition: { calories: 550, protein: 6, fat: 22, carbs: 78 },
			available: true,
			sales_count: 1240,
		},
		{
			id: "6",
			name: "Bowl Vegano",
			price: 10.5,
			restaurant: "Verde Vida",
			image_url:
				"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
			category: "vegetarian",
			rating: 4.5,
			likes: 95,
			description:
				"Nutritivo bowl con quinoa, garbanzos rostizados, aguacate, camote, espinacas baby y aderezo de tahini.",
			ingredients: [
				"Quinoa",
				"Garbanzos",
				"Aguacate",
				"Camote",
				"Espinacas",
				"Tahini",
			],
			nutrition: { calories: 480, protein: 18, fat: 24, carbs: 56 },
			available: true,
			sales_count: 342,
		},
	]);

	let loading = $state(false);
	let error = $state<string | null>(null);

	return {
		get all() {
			return dishes;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		findById(id: string) {
			return dishes.find((d) => d.id === id);
		},
	};
}
