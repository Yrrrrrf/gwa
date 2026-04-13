use super::Result;
use crate::entities::item::{Item, ItemEvent};
use async_trait::async_trait;
use futures_util::stream::BoxStream;

#[async_trait]
pub trait ItemRepository: Send + Sync {
    async fn find_by_id(&self, id: &str) -> Result<Option<Item>>;
    async fn list(&self) -> Result<Vec<Item>>;
    async fn create(&self, item: Item) -> Result<Item>;
    async fn delete(&self, id: &str) -> Result<()>;
    async fn subscribe(&self) -> Result<BoxStream<'static, Result<ItemEvent>>>;
}
