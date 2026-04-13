use crate::adapters::http::app_state::AppState;
use crate::application::use_cases::items::CreateItemRequest;
use crate::application::{AppError, AppResult};
use axum::{
    Json, Router,
    extract::{Path, State},
    routing::get,
};
use chrono::Utc;
use domain::entities::item::Item;

pub fn r() -> Router<AppState> {
    Router::new()
        .route("/", get(list_items).post(create_item))
        .route("/{id}", get(get_by_id).delete(delete_item))
}

async fn list_items(State(state): State<AppState>) -> AppResult<Json<Vec<Item>>> {
    let items = state.item_repo.list().await?;
    Ok(Json(items))
}

async fn get_by_id(State(state): State<AppState>, Path(id): Path<String>) -> AppResult<Json<Item>> {
    let full_id = if id.contains(':') {
        id
    } else {
        format!("item:{}", id)
    };

    let item = state
        .item_repo
        .find_by_id(&full_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Item {} not found", full_id)))?;

    Ok(Json(item))
}

async fn create_item(
    State(state): State<AppState>,
    Json(payload): Json<CreateItemRequest>,
) -> AppResult<Json<Item>> {
    let item = Item {
        id: "".to_string(),
        title: payload.title,
        description: payload.description,
        status: payload.status,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let created = state.item_repo.create(item).await?;
    Ok(Json(created))
}

async fn delete_item(State(state): State<AppState>, Path(id): Path<String>) -> AppResult<Json<()>> {
    let full_id = if id.contains(':') {
        id
    } else {
        format!("item:{}", id)
    };

    state.item_repo.delete(&full_id).await?;
    Ok(Json(()))
}
