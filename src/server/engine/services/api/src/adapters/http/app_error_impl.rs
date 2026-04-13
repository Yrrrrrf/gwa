use crate::application::AppError;
use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::json;

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error"),
            AppError::NotFound(ref msg) => (StatusCode::NOT_FOUND, msg.as_str()),
            AppError::Unauthorized(ref msg) => (StatusCode::UNAUTHORIZED, msg.as_str()),
            AppError::Validation(ref msg) => (StatusCode::BAD_REQUEST, msg.as_str()),
            AppError::Database(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
            AppError::DocumentGeneration(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Document generation error",
            ),
        };

        // In production, we should log the original internal errors.
        if let AppError::Internal(msg)
        | AppError::Database(msg)
        | AppError::DocumentGeneration(msg) = &self
        {
            tracing::error!("Internal error mapping to response: {}", msg);
        }

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}
