use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const TS_APPEND_CONTENT: &'static str = r#"
export type Role = "tourist" | "owner" | "admin";

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

export interface Item {
    id: string;
    title: string;
    description: string | null;
    status: string;
    created_at: string;
    updated_at: string;
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
