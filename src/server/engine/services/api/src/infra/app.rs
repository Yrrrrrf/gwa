use crate::adapters::http::app_state::AppState;
use crate::adapters::http::middleware as app_middleware;
use crate::adapters::http::routes;
use axum::{Router, middleware};
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

pub fn create_app(state: AppState) -> Router {
    let auth_routes = routes::auth::r();

    let business_routes = routes::businesses::r();

    let review_routes = routes::reviews::r().layer(middleware::from_fn_with_state(
        state.clone(),
        app_middleware::auth::auth_middleware,
    ));

    let recommendation_routes = routes::recommendations::r().layer(middleware::from_fn_with_state(
        state.clone(),
        app_middleware::auth::auth_middleware,
    ));

    Router::new()
        .nest("/auth", auth_routes)
        .nest("/businesses", business_routes)
        .nest("/reviews", review_routes)
        .nest("/recommendations", recommendation_routes)
        .with_state(state)
        // Global middlewares
        .layer(CorsLayer::permissive()) // Configure properly in production
        .layer(TraceLayer::new_for_http())
        .layer(middleware::from_fn(app_middleware::logger::request_logger))
}
