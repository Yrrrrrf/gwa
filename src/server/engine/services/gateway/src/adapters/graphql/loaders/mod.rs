use crate::adapters::http::app_state::AppState;
use async_graphql::Result;
use async_graphql::dataloader::Loader;
use async_trait::async_trait;
use domain::entities::item::Item;
use std::collections::HashMap;
use std::future::Future;
use std::sync::Arc;

pub struct ItemLoader {
    pub state: AppState,
}

#[async_trait]
impl Loader<String> for ItemLoader {
    type Value = Item;
    type Error = Arc<application::AppError>;

    fn load(
        &self,
        keys: &[String],
    ) -> impl Future<Output = Result<HashMap<String, Self::Value>, Self::Error>> + Send {
        let state = self.state.clone();
        let keys = keys.to_vec();
        async move {
            let mut results = HashMap::new();
            for key in keys {
                if let Ok(Some(item)) = state.item_repo.find_by_id(&key).await {
                    results.insert(key.clone(), item);
                }
            }
            Ok(results)
        }
    }
}
