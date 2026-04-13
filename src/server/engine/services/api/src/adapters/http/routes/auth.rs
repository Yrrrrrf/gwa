use crate::adapters::http::app_state::AppState;
use crate::application::use_cases::auth::{Claims, LoginRequest, LoginResponse};
use crate::application::{AppError, AppResult};
use axum::{Json, Router, extract::State, routing::post};
use chrono::{Duration, Utc};
use domain::entities::user::Session;
use jsonwebtoken::{Algorithm, EncodingKey, Header, encode};
use uuid::Uuid;

pub fn r() -> Router<AppState> {
    Router::new().route("/login", post(login))
}

async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> AppResult<Json<LoginResponse>> {
    let user = state
        .auth_repo
        .find_user_by_email(&payload.email)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Invalid credentials".into()))?;

    // HACKATHON: replace with Argon2 verify
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
        &EncodingKey::from_secret(state.jwt_secret.as_ref()),
    )
    .map_err(|e| AppError::Internal(format!("JWT encoding failed: {}", e)))?;

    // Create session in DB
    let session = Session {
        id: format!("session:{}", Uuid::new_v4()),
        user: user.id.clone(),
        token: token.clone(),
        user_agent: None,
        ip_address: None,
        expires_at: Utc::now() + Duration::days(1),
        created_at: Utc::now(),
    };

    state.auth_repo.create_session(session).await?;

    Ok(Json(LoginResponse { token, user }))
}
