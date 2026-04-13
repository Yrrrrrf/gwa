use super::Result;
use crate::entities::review::Review;
use async_trait::async_trait;

#[async_trait]
pub trait ReviewRepository: Send + Sync {
    async fn create(&self, review: Review) -> Result<()>;
    async fn find_by_business(&self, business_id: &str) -> Result<Vec<Review>>;
}
