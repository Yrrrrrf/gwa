use crate::adapters::graphql::loaders::ItemLoader;
use crate::adapters::http::app_state::AppState;
use application::use_cases::auth::Claims;
use async_graphql::dataloader::DataLoader;
use async_graphql::runtime::{TokioSpawner, TokioTimer};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse, GraphQLSubscription};
use axum::{
    Router,
    extract::State,
    http::{HeaderMap, header},
    response::{Html, IntoResponse},
    routing::get,
};
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode};

pub fn r_with_schema(schema: crate::adapters::graphql::AppSchema) -> Router<AppState> {
    Router::new()
        .route("/", get(graphiql).post(graphql_handler))
        .route_service("/ws", GraphQLSubscription::new(schema))
}

async fn graphiql() -> impl IntoResponse {
    Html(
        async_graphql::http::GraphiQLSource::build()
            .endpoint("/graphql")
            .subscription_endpoint("/graphql/ws")
            .finish(),
    )
}

async fn graphql_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    graphql_req: GraphQLRequest,
) -> GraphQLResponse {
    // Extract claims from Authorization header
    let claims = headers
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|h: &str| h.strip_prefix("Bearer "))
        .and_then(|token: &str| {
            decode::<Claims>(
                token,
                &DecodingKey::from_secret(state.jwt_secret.as_bytes()),
                &Validation::new(Algorithm::HS256),
            )
            .ok()
        })
        .map(|data| data.claims);

    let mut graphql_req = graphql_req.into_inner();

    // DataLoaders
    let item_loader = DataLoader::new(
        ItemLoader {
            state: state.clone(),
        },
        TokioSpawner::current(),
        TokioTimer::default(),
    );

    graphql_req = graphql_req.data(state.clone());
    graphql_req = graphql_req.data(item_loader);

    if let Some(c) = claims {
        graphql_req = graphql_req.data(c);
    }

    state.schema.execute(graphql_req).await.into()
}
