use crate::shared::{context::Context, error::Fault};
use axum::{
    Json, Router,
    body::Bytes,
    extract::{DefaultBodyLimit, Path, State},
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde_json::{Value, json};
use std::sync::Arc;
fn authorize(context: &Context, headers: &HeaderMap) -> Result<(), Fault> {
    context.bearer(
        headers
            .get(header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok()),
    )
}
pub fn router(context: Arc<Context>) -> Router {
    let limit = context.config.server.max_body_bytes;
    Router::new()
        .route("/health", get(|| async { Json(json!({"alive":true})) }))
        .route("/ready", get(ready))
        .route("/api", get(list))
        .route("/api/{service}/{operation}", post(invoke))
        .route("/rpc", post(rpc))
        .route("/ws", get(super::websocket::upgrade))
        .route("/artifacts/{id}", get(artifact))
        .layer(DefaultBodyLimit::max(limit))
        .layer(tower_http::trace::TraceLayer::new_for_http())
        .with_state(context)
}
async fn ready(State(context): State<Arc<Context>>) -> impl IntoResponse {
    let ready = context.ready.get();
    (
        if ready {
            StatusCode::OK
        } else {
            StatusCode::SERVICE_UNAVAILABLE
        },
        Json(json!({"ready":ready})),
    )
}
async fn list(
    State(context): State<Arc<Context>>,
    headers: HeaderMap,
) -> Result<Json<Value>, Fault> {
    authorize(&context, &headers)?;
    Ok(Json(json!({"operations":context.names()})))
}
async fn invoke(
    State(context): State<Arc<Context>>,
    Path((service, operation)): Path<(String, String)>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Json<Value>, Fault> {
    authorize(&context, &headers)?;
    let payload = serde_json::from_slice(&body).map_err(|e| Fault::invalid(e.to_string()))?;
    Ok(Json(
        context
            .invoke(&format!("{service}.{operation}"), payload)
            .await?,
    ))
}
async fn rpc(
    State(context): State<Arc<Context>>,
    headers: HeaderMap,
    body: Bytes,
) -> Result<Response, Fault> {
    authorize(&context, &headers)?;
    Ok(match super::json_rpc::dispatch(&context, &body).await {
        Some(reply) => Json(reply).into_response(),
        None => StatusCode::NO_CONTENT.into_response(),
    })
}
async fn artifact(
    State(context): State<Arc<Context>>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<Response, Fault> {
    authorize(&context, &headers)?;
    let (stem, extension) = id
        .rsplit_once('.')
        .ok_or_else(|| Fault::invalid("invalid artifact name"))?;
    if uuid::Uuid::parse_str(stem).is_err() {
        return Err(Fault::invalid("invalid artifact name"));
    }
    let mime = match extension {
        "txt" => "text/plain; charset=utf-8",
        "html" => "text/html; charset=utf-8",
        _ => return Err(Fault::invalid("invalid artifact extension")),
    };
    let bytes = tokio::fs::read(
        context
            .config
            .server
            .artifacts_dir
            .join("reports")
            .join(&id),
    )
    .await
    .map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            Fault::new("not_found", "artifact not found")
        } else {
            Fault::internal(e)
        }
    })?;
    Ok((
        [
            (header::CONTENT_TYPE, mime.to_owned()),
            (
                header::CONTENT_DISPOSITION,
                format!("attachment; filename=\"{id}\""),
            ),
            (header::X_CONTENT_TYPE_OPTIONS, "nosniff".into()),
        ],
        bytes,
    )
        .into_response())
}
