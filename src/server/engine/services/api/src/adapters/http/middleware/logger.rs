// We can just use tower_http::trace::TraceLayer in the app setup,
// but if a custom logger is specified by the spec:
use axum::{extract::Request, middleware::Next, response::Response};
use tracing::info;

pub async fn request_logger(req: Request, next: Next) -> Response {
    let method = req.method().clone();
    let uri = req.uri().clone();

    info!("--> {} {}", method, uri);

    let res = next.run(req).await;

    info!("<-- {} {} - {}", method, uri, res.status());

    res
}
