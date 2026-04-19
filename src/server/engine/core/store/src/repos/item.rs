use crate::client::SurrealClient;
use async_trait::async_trait;
use domain::entities::comment::Comment;
use domain::entities::item::{Coordinates, Item, ItemAction, ItemEvent};
use domain::ports::DomainError;
use domain::ports::Result as DomainResult;
use domain::ports::item::ItemRepository;
use futures_util::stream::{BoxStream, StreamExt};
use serde_json;
use surrealdb_types::{Action, RecordId, SurrealValue, Value};

pub struct SurrealItemRepo {
    client: SurrealClient,
}

impl SurrealItemRepo {
    pub fn new(client: SurrealClient) -> Self {
        Self { client }
    }

    fn to_domain<T: serde::de::DeserializeOwned>(value: Value) -> DomainResult<T> {
        let json = value.into_json_value();
        serde_json::from_value(json).map_err(|e| DomainError::Internal(e.to_string()))
    }

    fn from_domain<T: serde::Serialize>(data: T) -> DomainResult<Value> {
        let json = serde_json::to_value(data).map_err(|e| DomainError::Internal(e.to_string()))?;
        Ok(json.into_value())
    }

    fn to_domain_vec<T: serde::de::DeserializeOwned>(values: Vec<Value>) -> DomainResult<Vec<T>> {
        values.into_iter().map(Self::to_domain).collect()
    }

    fn parse_rid(id: &str) -> DomainResult<RecordId> {
        let parts: Vec<&str> = id.split(':').collect();
        if parts.len() != 2 {
            return Err(DomainError::Internal(format!("Invalid record ID: {}", id)));
        }
        Ok(RecordId::new(parts[0], parts[1]))
    }
}

#[async_trait]
impl ItemRepository for SurrealItemRepo {
    async fn find_by_id(&self, id: &str) -> DomainResult<Option<Item>> {
        let rid = Self::parse_rid(id)?;
        let value: Option<Value> = self
            .client
            .db
            .select(rid)
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        value.map(Self::to_domain).transpose()
    }

    async fn list(&self) -> DomainResult<Vec<Item>> {
        let mut response = self
            .client
            .db
            .query("SELECT * FROM item")
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let values: Vec<Value> = response
            .take(0)
            .map_err(|e| DomainError::Repository(e.to_string()))?;
        Self::to_domain_vec(values)
    }

    async fn create(&self, item: Item) -> DomainResult<Item> {
        let surreal_value = Self::from_domain(item)?;

        let value: Option<Value> = self
            .client
            .db
            .create("item")
            .content(surreal_value)
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        value
            .ok_or_else(|| DomainError::Internal("Failed to create item".to_string()))
            .and_then(Self::to_domain)
    }

    async fn delete(&self, id: &str) -> DomainResult<()> {
        let rid = Self::parse_rid(id)?;
        let _: Option<Value> = self
            .client
            .db
            .delete(rid)
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        Ok(())
    }

    async fn subscribe(&self) -> DomainResult<BoxStream<'static, DomainResult<ItemEvent>>> {
        let stream = self
            .client
            .db
            .select("item")
            .live()
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let domain_stream = stream.filter_map(|notification| async {
            let n = match notification {
                Ok(n) => n,
                Err(e) => return Some(Err(DomainError::Repository(e.to_string()))),
            };
            let action = match n.action {
                Action::Create => ItemAction::Create,
                Action::Update => ItemAction::Update,
                Action::Delete => ItemAction::Delete,
                _ => return None,
            };
            let item: Item = match Self::to_domain(n.data) {
                Ok(i) => i,
                Err(e) => return Some(Err(e)),
            };
            Some(Ok(ItemEvent { action, item }))
        });

        Ok(Box::pin(domain_stream))
    }

    async fn search(&self, query: &str, limit: i32) -> DomainResult<Vec<Item>> {
        let mut response = self
            .client
            .db
            .query("RETURN fn::search_items($query, $limit)")
            .bind(("query", query.to_string()))
            .bind(("limit", limit))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let values: Vec<Value> = response
            .take(0)
            .map_err(|e| DomainError::Repository(e.to_string()))?;
        Self::to_domain_vec(values)
    }

    async fn popular(&self, limit: i32) -> DomainResult<Vec<Item>> {
        let mut response = self
            .client
            .db
            .query("RETURN fn::popular_items($limit)")
            .bind(("limit", limit))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let values: Vec<Value> = response
            .take(0)
            .map_err(|e| DomainError::Repository(e.to_string()))?;
        Self::to_domain_vec(values)
    }

    async fn near(&self, coords: Coordinates, radius_km: f64) -> DomainResult<Vec<Item>> {
        let point = serde_json::json!({
            "type": "Point",
            "coordinates": [coords.lng, coords.lat]
        });

        let mut response = self
            .client
            .db
            .query("RETURN fn::items_near($point, $radius)")
            .bind(("point", point))
            .bind(("radius", radius_km))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let values: Vec<Value> = response
            .take(0)
            .map_err(|e| DomainError::Repository(e.to_string()))?;
        Self::to_domain_vec(values)
    }

    async fn recommendations(&self, user_id: &str, limit: i32) -> DomainResult<Vec<Item>> {
        let rid = Self::parse_rid(user_id)?;
        let mut response = self
            .client
            .db
            .query("RETURN fn::user_recommendations($user, $limit)")
            .bind(("user", rid))
            .bind(("limit", limit))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let values: Vec<Value> = response
            .take(0)
            .map_err(|e| DomainError::Repository(e.to_string()))?;
        Self::to_domain_vec(values)
    }

    async fn add_comment(
        &self,
        user_id: &str,
        item_id: &str,
        rating: i32,
        body: Option<String>,
    ) -> DomainResult<Comment> {
        let user_rid = Self::parse_rid(user_id)?;
        let item_rid = Self::parse_rid(item_id)?;

        let mut response = self
            .client
            .db
            .query("RELATE $user->comment->$item SET rating = $rating, body = $body RETURN *")
            .bind(("user", user_rid))
            .bind(("item", item_rid))
            .bind(("rating", rating))
            .bind(("body", body))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let value: Option<Value> = response
            .take(0)
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        value
            .ok_or_else(|| DomainError::Internal("Failed to add comment".to_string()))
            .and_then(Self::to_domain)
    }

    async fn list_comments(&self, item_id: &str) -> DomainResult<Vec<Comment>> {
        let rid = Self::parse_rid(item_id)?;
        let mut response = self
            .client
            .db
            .query("SELECT * FROM comment WHERE out = $item")
            .bind(("item", rid))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let values: Vec<Value> = response
            .take(0)
            .map_err(|e| DomainError::Repository(e.to_string()))?;
        Self::to_domain_vec(values)
    }

    async fn toggle_like(&self, user_id: &str, item_id: &str) -> DomainResult<()> {
        let user_rid = Self::parse_rid(user_id)?;
        let item_rid = Self::parse_rid(item_id)?;

        self.client
            .db
            .query(
                "
            LET $exists = (SELECT id FROM likes WHERE in = $user AND out = $item);
            IF array::len($exists) > 0 {
                DELETE likes WHERE in = $user AND out = $item;
            } ELSE {
                RELATE $user->likes->$item;
            };
        ",
            )
            .bind(("user", user_rid))
            .bind(("item", item_rid))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        Ok(())
    }
}
