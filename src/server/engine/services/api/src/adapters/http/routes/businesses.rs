use crate::adapters::http::app_state::AppState;
use crate::application::{AppError, AppResult};
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    routing::get,
};
use domain::entities::business::{Business, Point};
use serde::Deserialize;

pub fn r() -> Router<AppState> {
    Router::new()
        .route("/near", get(find_near))
        .route("/search", get(search))
        .route("/{id}", get(get_by_id))
}

#[derive(Deserialize)]
pub struct NearQuery {
    pub lat: f64,
    pub lon: f64,
    pub radius_km: f64,
}

async fn find_near(
    State(state): State<AppState>,
    Query(query): Query<NearQuery>,
) -> AppResult<Json<Vec<Business>>> {
    let point = Point::new(query.lon, query.lat);
    let businesses = state
        .business_repo
        .find_near(point, query.radius_km)
        .await?;
    Ok(Json(businesses))
}

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub locale: String,
    pub city: Option<String>,
    pub category: Option<String>,
}

async fn search(
    State(state): State<AppState>,
    Query(query): Query<SearchQuery>,
) -> AppResult<Json<Vec<Business>>> {
    let businesses = state
        .business_repo
        .search(
            &query.q,
            &query.locale,
            query.city.as_deref(),
            query.category.as_deref(),
        )
        .await?;
    Ok(Json(businesses))
}

async fn get_by_id(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> AppResult<Json<Business>> {
    let full_id = if id.contains(':') {
        id
    } else {
        format!("business:{}", id)
    };

    let business = state
        .business_repo
        .find_by_id(&full_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Business {} not found", full_id)))?;

    Ok(Json(business))
}
