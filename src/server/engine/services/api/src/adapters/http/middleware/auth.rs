use crate::adapters::http::app_state::AppState;
use crate::application::AppError;
use crate::application::use_cases::auth::Claims;
use axum::{
    extract::{Request, State},
    http::header,
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode};

pub async fn auth_middleware(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Result<Response, AppError> {
    let auth_header = req.headers().get(header::AUTHORIZATION);

    let auth_header = match auth_header {
        Some(header) => header
            .to_str()
            .map_err(|_| AppError::Unauthorized("Invalid header".into()))?,
        None => {
            return Err(AppError::Unauthorized(
                "Missing authorization header".into(),
            ));
        }
    };

    if !auth_header.starts_with("Bearer ") {
        return Err(AppError::Unauthorized(
            "Invalid authorization header format".into(),
        ));
    }

    let token = &auth_header[7..];

    // Decode JWT
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(state.jwt_secret.as_ref()),
        &Validation::new(Algorithm::HS256),
    )
    .map_err(|e| AppError::Unauthorized(format!("Invalid token: {}", e)))?;

    let claims = token_data.claims;

    // Verify session still exists in DB
    let _session = state
        .auth_repo
        .find_session_by_token(token)
        .await
        .map_err(|e| AppError::Internal(e.to_string()))?
        .ok_or_else(|| AppError::Unauthorized("Session expired or logged out".into()))?;

    // Inject claims into request extensions
    req.extensions_mut().insert(claims);

    Ok(next.run(req).await)
}
