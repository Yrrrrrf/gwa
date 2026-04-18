use crate::adapters::graphql::types::item::ItemType;
use crate::adapters::http::app_state::AppState;
use crate::adapters::graphql::guards::AuthGuard;
use application::use_cases::auth::Claims;
use application::use_cases::items::{get_item_by_id, list_items, search_items, get_popular_items, get_items_near, get_recommendations};
use async_graphql::{Context, Object, Result};

pub struct Query;

#[Object]
impl Query {
    async fn items(&self, ctx: &Context<'_>) -> Result<Vec<ItemType>> {
        let state = ctx.data::<AppState>()?;
        let items = list_items(&*state.item_repo).await?;
        Ok(items.into_iter().map(ItemType::from).collect())
    }

    async fn item(&self, ctx: &Context<'_>, id: String) -> Result<ItemType> {
        let state = ctx.data::<AppState>()?;
        let item = get_item_by_id(&*state.item_repo, &id).await?;
        Ok(ItemType::from(item))
    }

    async fn search_items(&self, ctx: &Context<'_>, query: String, limit: Option<i32>) -> Result<Vec<ItemType>> {
        let state = ctx.data::<AppState>()?;
        let items = search_items(&*state.item_repo, &query, limit.unwrap_or(10)).await?;
        Ok(items.into_iter().map(ItemType::from).collect())
    }

    async fn popular_items(&self, ctx: &Context<'_>, limit: Option<i32>) -> Result<Vec<ItemType>> {
        let state = ctx.data::<AppState>()?;
        let items = get_popular_items(&*state.item_repo, limit.unwrap_or(10)).await?;
        Ok(items.into_iter().map(ItemType::from).collect())
    }

    async fn items_near(&self, ctx: &Context<'_>, lat: f64, lng: f64, radius_km: Option<f64>) -> Result<Vec<ItemType>> {
        let state = ctx.data::<AppState>()?;
        let items = get_items_near(&*state.item_repo, lat, lng, radius_km.unwrap_or(10.0)).await?;
        Ok(items.into_iter().map(ItemType::from).collect())
    }

    #[graphql(guard = "AuthGuard")]
    async fn recommendations(&self, ctx: &Context<'_>, limit: Option<i32>) -> Result<Vec<ItemType>> {
        let state = ctx.data::<AppState>()?;
        let claims = ctx.data::<Claims>()?;
        let items = get_recommendations(&*state.item_repo, &claims.sub, limit.unwrap_or(5)).await?;
        Ok(items.into_iter().map(ItemType::from).collect())
    }

    async fn health(&self) -> &str {
        "ok"
    }
}
