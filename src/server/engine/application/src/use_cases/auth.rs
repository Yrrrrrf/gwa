use crate::error::{AppError, AppResult};
use chrono::{Duration, Utc};
use domain::entities::user::{Session, User};
use domain::ports::auth::AuthRepository;
use jsonwebtoken::{Algorithm, EncodingKey, Header, encode};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // user id ("user:alice")
    pub email: String,
    pub role: String, // "user", "owner", "admin"
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

pub async fn login(
    auth_repo: &dyn AuthRepository,
    jwt_secret: &str,
    payload: LoginRequest,
) -> AppResult<LoginResponse> {
    let user = auth_repo
        .find_user_by_email(&payload.email)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Invalid credentials".into()))?;

    // HACKATHON: using plain text comparison to match seed data
    if user.password_hash != payload.password {
        return Err(AppError::Unauthorized("Invalid credentials".into()));
    }

    let exp = (Utc::now() + Duration::days(1)).timestamp() as usize;
    let claims = Claims {
        sub: user.id.clone(),
        email: user.email.clone(),
        role: format!("{:?}", user.role).to_lowercase(),
        exp,
    };

    let token = encode(
        &Header::new(Algorithm::HS256),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("JWT encoding failed: {}", e)))?;

    // Create session in DB
    let session = Session {
        id: format!("session:{}", Uuid::new_v4()),
        user: user.id.clone(),
        session_token: token.clone(),
        user_agent: None,
        ip_address: None,
        expires_at: Utc::now() + Duration::days(1),
        created_at: Utc::now(),
    };

    auth_repo.create_session(session).await?;

    Ok(LoginResponse { token, user })
}
