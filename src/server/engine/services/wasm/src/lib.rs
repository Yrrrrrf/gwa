use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const TS_APPEND_CONTENT: &'static str = r#"
export type Role = "tourist" | "owner" | "admin";
export type PriceRange = "$" | "$$" | "$$$";

export interface Point {
    longitude: number;
    latitude: number;
}

export interface User {
    id: string;
    username: string;
    email: string;
    role: Role;
    display_name: string | null;
    avatar_url: string | null;
    locale: string;
    country_code: string | null;
}

export interface Business {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: string;
    city: string;
    coordinates: Point;
    address: string | null;
    neighborhood: string | null;
    price_range: PriceRange;
    languages_spoken: string[];
    rating: number | null;
    review_count: number;
}
"#;

#[wasm_bindgen]
pub fn validate_email(email: &str) -> bool {
    // Basic validation stub
    email.contains('@') && email.contains('.')
}

#[wasm_bindgen]
pub fn validate_rating(rating: i32) -> bool {
    rating >= 1 && rating <= 5
}
