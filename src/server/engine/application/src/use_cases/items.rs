use crate::error::{AppError, AppResult};
use chrono::Utc;
use domain::entities::comment::Comment;
use domain::entities::item::{Coordinates, Item};
use domain::ports::item::ItemRepository;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct CreateItemRequest {
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub tags: Option<Vec<String>>,
    pub coordinates: Option<Coordinates>,
}

#[derive(Debug, Deserialize)]
pub struct AddCommentRequest {
    pub item_id: String,
    pub rating: i32,
    pub body: Option<String>,
}

pub async fn list_items(item_repo: &dyn ItemRepository) -> AppResult<Vec<Item>> {
    item_repo.list().await.map_err(Into::into)
}

pub async fn get_item_by_id(item_repo: &dyn ItemRepository, id: &str) -> AppResult<Item> {
    let full_id = ensure_id(id, "item");
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
        tags: payload.tags.unwrap_or_default(),
        coordinates: payload.coordinates,
        rating: None,
        comment_count: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    item_repo.create(item).await.map_err(Into::into)
}

pub async fn delete_item(item_repo: &dyn ItemRepository, id: &str) -> AppResult<()> {
    let full_id = ensure_id(id, "item");
    item_repo.delete(&full_id).await.map_err(Into::into)
}

pub async fn search_items(
    item_repo: &dyn ItemRepository,
    query: &str,
    limit: i32,
) -> AppResult<Vec<Item>> {
    item_repo.search(query, limit).await.map_err(Into::into)
}

pub async fn get_popular_items(item_repo: &dyn ItemRepository, limit: i32) -> AppResult<Vec<Item>> {
    item_repo.popular(limit).await.map_err(Into::into)
}

pub async fn get_items_near(
    item_repo: &dyn ItemRepository,
    lat: f64,
    lng: f64,
    radius_km: f64,
) -> AppResult<Vec<Item>> {
    item_repo
        .near(Coordinates { lat, lng }, radius_km)
        .await
        .map_err(Into::into)
}

pub async fn get_recommendations(
    item_repo: &dyn ItemRepository,
    user_id: &str,
    limit: i32,
) -> AppResult<Vec<Item>> {
    let full_id = ensure_id(user_id, "user");
    item_repo
        .recommendations(&full_id, limit)
        .await
        .map_err(Into::into)
}

pub async fn add_comment(
    item_repo: &dyn ItemRepository,
    user_id: &str,
    payload: AddCommentRequest,
) -> AppResult<Comment> {
    let user_full_id = ensure_id(user_id, "user");
    let item_full_id = ensure_id(&payload.item_id, "item");
    item_repo
        .add_comment(&user_full_id, &item_full_id, payload.rating, payload.body)
        .await
        .map_err(Into::into)
}

pub async fn list_comments(
    item_repo: &dyn ItemRepository,
    item_id: &str,
) -> AppResult<Vec<Comment>> {
    let full_id = ensure_id(item_id, "item");
    item_repo.list_comments(&full_id).await.map_err(Into::into)
}

pub async fn toggle_like(
    item_repo: &dyn ItemRepository,
    user_id: &str,
    item_id: &str,
) -> AppResult<()> {
    let user_full_id = ensure_id(user_id, "user");
    let item_full_id = ensure_id(item_id, "item");
    item_repo
        .toggle_like(&user_full_id, &item_full_id)
        .await
        .map_err(Into::into)
}

fn ensure_id(id: &str, tb: &str) -> String {
    if id.contains(':') {
        id.to_string()
    } else {
        format!("{}:{}", tb, id)
    }
}
