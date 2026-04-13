use crate::error::{AppError, AppResult};
use chrono::Utc;
use domain::entities::item::Item;
use domain::ports::item::ItemRepository;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct CreateItemRequest {
    pub title: String,
    pub description: Option<String>,
    pub status: String,
}

#[derive(Debug, Serialize)]
pub struct ItemResponse {
    pub item: Item,
}

pub async fn list_items(item_repo: &dyn ItemRepository) -> AppResult<Vec<Item>> {
    item_repo.list().await.map_err(Into::into)
}

pub async fn get_item_by_id(item_repo: &dyn ItemRepository, id: &str) -> AppResult<Item> {
    let full_id = if id.contains(':') {
        id.to_string()
    } else {
        format!("item:{}", id)
    };

    item_repo
        .find_by_id(&full_id)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Item {} not found", full_id)))
}

pub async fn create_item(
    item_repo: &dyn ItemRepository,
    payload: CreateItemRequest,
) -> AppResult<Item> {
    let item = Item {
        id: "".to_string(),
        title: payload.title,
        description: payload.description,
        status: payload.status,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    item_repo.create(item).await.map_err(Into::into)
}

pub async fn delete_item(item_repo: &dyn ItemRepository, id: &str) -> AppResult<()> {
    let full_id = if id.contains(':') {
        id.to_string()
    } else {
        format!("item:{}", id)
    };

    item_repo.delete(&full_id).await.map_err(Into::into)
}
