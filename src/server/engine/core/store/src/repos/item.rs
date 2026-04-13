use crate::client::SurrealClient;
use async_trait::async_trait;
use domain::entities::item::Item;
use domain::ports::DomainError;
use domain::ports::Result as DomainResult;
use domain::ports::item::ItemRepository;
use serde_json;
use surrealdb_types::RecordId;
use surrealdb_types::SurrealValue;
use surrealdb_types::Value;

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
}

#[async_trait]
impl ItemRepository for SurrealItemRepo {
    async fn find_by_id(&self, id: &str) -> DomainResult<Option<Item>> {
        let parts: Vec<&str> = id.split(':').collect();
        if parts.len() != 2 {
            return Err(DomainError::Internal(format!("Invalid record ID: {}", id)));
        }
        let rid = RecordId::new(parts[0], parts[1]);

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
        let parts: Vec<&str> = id.split(':').collect();
        if parts.len() != 2 {
            return Err(DomainError::Internal(format!("Invalid record ID: {}", id)));
        }
        let rid = RecordId::new(parts[0], parts[1]);

        let _: Option<Value> = self
            .client
            .db
            .delete(rid)
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        Ok(())
    }
}
