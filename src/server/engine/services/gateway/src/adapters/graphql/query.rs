use crate::adapters::graphql::types::item::ItemType;
use crate::adapters::http::app_state::AppState;
use application::use_cases::items::{get_item_by_id, list_items};
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

    async fn health(&self) -> &str {
        "ok"
    }
}
