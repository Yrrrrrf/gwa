use crate::adapters::http::app_state::AppState;
use crate::adapters::http::routes;
use axum::Router;
use tower_http::cors::CorsLayer;
use tower_http::trace::TraceLayer;

pub fn create_app(state: AppState) -> Router {
    // GraphQL with subscription support is the sole entry point
    let graphql_routes = routes::graphql::r_with_schema(state.schema.clone());

    Router::new()
        .nest("/graphql", graphql_routes)
        .with_state(state)
        // Global middlewares
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
}
