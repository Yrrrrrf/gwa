use domain::entities::item::Item;
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
