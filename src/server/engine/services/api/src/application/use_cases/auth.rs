use domain::entities::user::User;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user id ("user:tourist_akiko")
    pub email: String,
    pub role: String, // "tourist", "owner", "admin"
    pub exp: usize,   // expiry timestamp
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: User,
}
