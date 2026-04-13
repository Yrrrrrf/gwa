use crate::adapters::http::app_state::AppState;
use crate::application::AppResult;
use crate::application::use_cases::auth::Claims;
use axum::{
    Extension, Json, Router,
    extract::{Query, State},
    routing::get,
};
use domain::entities::business::Business;
use serde::Deserialize;

pub fn r() -> Router<AppState> {
    Router::new().route("/", get(get_recommendations))
}

#[derive(Deserialize)]
pub struct RecommendationQuery {
    pub limit: Option<usize>,
}

async fn get_recommendations(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<RecommendationQuery>,
) -> AppResult<Json<Vec<Business>>> {
    let limit = query.limit.unwrap_or(5);
    let recommendations = state
        .business_repo
        .get_recommendations(&claims.sub, limit)
        .await?;
    Ok(Json(recommendations))
}
