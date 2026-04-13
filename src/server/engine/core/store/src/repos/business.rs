use crate::client::SurrealClient;
use async_trait::async_trait;
use domain::entities::business::{Business, Point};
use domain::ports::DomainError;
use domain::ports::Result as DomainResult;
use domain::ports::business::BusinessRepository;
use serde_json;
use surrealdb_types::RecordId;
use surrealdb_types::Value;

pub struct SurrealBusinessRepo {
    client: SurrealClient,
}

impl SurrealBusinessRepo {
    pub fn new(client: SurrealClient) -> Self {
        Self { client }
    }

    fn to_domain<T: serde::de::DeserializeOwned>(value: Value) -> DomainResult<T> {
        let json = value.into_json_value();
        serde_json::from_value(json).map_err(|e| DomainError::Internal(e.to_string()))
    }

    fn to_domain_vec<T: serde::de::DeserializeOwned>(values: Vec<Value>) -> DomainResult<Vec<T>> {
        values.into_iter().map(Self::to_domain).collect()
    }
}

#[async_trait]
impl BusinessRepository for SurrealBusinessRepo {
    async fn find_by_id(&self, id: &str) -> DomainResult<Option<Business>> {
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

    async fn list_active(&self) -> DomainResult<Vec<Business>> {
        let mut response = self
            .client
            .db
            .query("SELECT * FROM business WHERE is_active = true")
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let values: Vec<Value> = response
            .take(0)
            .map_err(|e| DomainError::Repository(e.to_string()))?;
        Self::to_domain_vec(values)
    }

    async fn search(
        &self,
        query: &str,
        locale: &str,
        city_id: Option<&str>,
        category_id: Option<&str>,
    ) -> DomainResult<Vec<Business>> {
        let sql = "SELECT * FROM fn::search_businesses($query, $locale, if $city { type::record($city) } else { NONE }, if $category { type::record($category) } else { NONE })";
        let mut response = self
            .client
            .db
            .query(sql)
            .bind(("query", query.to_string()))
            .bind(("locale", locale.to_string()))
            .bind(("city", city_id.map(|s| s.to_string())))
            .bind(("category", category_id.map(|s| s.to_string())))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let values: Vec<Value> = response
            .take(0)
            .map_err(|e| DomainError::Repository(e.to_string()))?;
        Self::to_domain_vec(values)
    }

    async fn find_near(&self, point: Point, radius_km: f64) -> DomainResult<Vec<Business>> {
        let sql = "RETURN fn::businesses_near(type::point([$lon, $lat]), $radius)";
        let mut response = self
            .client
            .db
            .query(sql)
            .bind(("lon", point.longitude()))
            .bind(("lat", point.latitude()))
            .bind(("radius", radius_km))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let values: Vec<Value> = response
            .take(0)
            .map_err(|e| DomainError::Repository(e.to_string()))?;
        Self::to_domain_vec(values)
    }

    async fn get_recommendations(
        &self,
        user_id: &str,
        limit: usize,
    ) -> DomainResult<Vec<Business>> {
        let sql = "RETURN fn::tourist_recommendations(type::record($user), $limit)";
        let mut response = self
            .client
            .db
            .query(sql)
            .bind(("user", user_id.to_string()))
            .bind(("limit", limit))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let values: Vec<Value> = response
            .take(0)
            .map_err(|e| DomainError::Repository(e.to_string()))?;
        Self::to_domain_vec(values)
    }
}
