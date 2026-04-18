use super::Result;
use crate::entities::item::{Item, ItemEvent, Coordinates};
use crate::entities::comment::Comment;
use async_trait::async_trait;
use futures_util::stream::BoxStream;

#[async_trait]
pub trait ItemRepository: Send + Sync {
    async fn find_by_id(&self, id: &str) -> Result<Option<Item>>;
    async fn list(&self) -> Result<Vec<Item>>;
    async fn create(&self, item: Item) -> Result<Item>;
    async fn delete(&self, id: &str) -> Result<()>;
    async fn subscribe(&self) -> Result<BoxStream<'static, Result<ItemEvent>>>;
    
    // New methods for SurrealDB features
    async fn search(&self, query: &str, limit: i32) -> Result<Vec<Item>>;
    async fn popular(&self, limit: i32) -> Result<Vec<Item>>;
    async fn near(&self, coordinates: Coordinates, radius_km: f64) -> Result<Vec<Item>>;
    async fn recommendations(&self, user_id: &str, limit: i32) -> Result<Vec<Item>>;
    
    async fn add_comment(&self, user_id: &str, item_id: &str, rating: i32, body: Option<String>) -> Result<Comment>;
    async fn list_comments(&self, item_id: &str) -> Result<Vec<Comment>>;
    async fn toggle_like(&self, user_id: &str, item_id: &str) -> Result<()>;
}
