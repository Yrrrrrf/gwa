use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
#[derive(Debug, Clone, thiserror::Error, Serialize)]
#[error("{message}")]
pub struct Fault {
    pub code: &'static str,
    pub message: String,
}
impl Fault {
    pub fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
    pub fn invalid(message: impl Into<String>) -> Self {
        Self::new("invalid", message)
    }
    pub fn internal(error: impl std::fmt::Display) -> Self {
        tracing::error!(error = %error, "operation failed");
        Self::new("internal", "operation failed")
    }
    pub fn status(&self) -> StatusCode {
        match self.code {
            "invalid" => StatusCode::BAD_REQUEST,
            "unauthorized" => StatusCode::UNAUTHORIZED,
            "not_found" => StatusCode::NOT_FOUND,
            "busy" => StatusCode::SERVICE_UNAVAILABLE,
            "timeout" => StatusCode::GATEWAY_TIMEOUT,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}
impl IntoResponse for Fault {
    fn into_response(self) -> Response {
        (self.status(), Json(self)).into_response()
    }
}
