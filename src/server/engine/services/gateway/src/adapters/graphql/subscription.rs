use crate::adapters::graphql::types::item::ItemEventType;
use crate::adapters::http::app_state::AppState;
use async_graphql::{Context, Result, Subscription};
use futures_util::{StreamExt, stream::BoxStream};

pub struct Subscription;

#[Subscription]
impl Subscription {
    async fn items(&self, ctx: &Context<'_>) -> Result<BoxStream<'static, ItemEventType>> {
        let state = ctx.data::<AppState>()?;
        let stream = state.item_repo.subscribe().await?;

        let domain_stream = stream.filter_map(|res| async {
            match res {
                Ok(event) => Some(ItemEventType::from(event)),
                Err(_) => None,
            }
        });

        Ok(Box::pin(domain_stream))
    }

    async fn ping(&self) -> BoxStream<'static, String> {
        Box::pin(futures_util::stream::once(async { "pong".to_string() }))
    }
}
