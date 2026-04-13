use super::Result;
use crate::entities::business::{Business, Point};
use async_trait::async_trait;

#[async_trait]
pub trait BusinessRepository: Send + Sync {
    async fn find_by_id(&self, id: &str) -> Result<Option<Business>>;
    async fn list_active(&self) -> Result<Vec<Business>>;
    async fn search(
        &self,
        query: &str,
        locale: &str,
        city_id: Option<&str>,
        category_id: Option<&str>,
    ) -> Result<Vec<Business>>;
    async fn find_near(&self, point: Point, radius_km: f64) -> Result<Vec<Business>>;
    async fn get_recommendations(&self, user_id: &str, limit: usize) -> Result<Vec<Business>>;
}
