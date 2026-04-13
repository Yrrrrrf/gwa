use crate::client::SurrealClient;
use async_trait::async_trait;
use domain::entities::review::Review;
use domain::ports::DomainError;
use domain::ports::Result as DomainResult;
use domain::ports::review::ReviewRepository;
use serde_json;
use surrealdb_types::Value;

pub struct SurrealReviewRepo {
    client: SurrealClient,
}

impl SurrealReviewRepo {
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
impl ReviewRepository for SurrealReviewRepo {
    async fn create(&self, review: Review) -> DomainResult<()> {
        let sql = "LET $user_id = type::record($user);
            LET $business_id = type::record($business);
            RELATE $user_id -> review -> $business_id 
            SET rating = $rating, body = $body, locale = $locale, created_at = $created_at";

        self.client
            .db
            .query(sql)
            .bind(("user", review.user.to_string()))
            .bind(("business", review.business.to_string()))
            .bind(("rating", review.rating))
            .bind(("body", review.body.map(|s| s.to_string())))
            .bind(("locale", review.locale.to_string()))
            .bind(("created_at", review.created_at))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?
            .check()
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        Ok(())
    }

    async fn find_by_business(&self, business_id: &str) -> DomainResult<Vec<Review>> {
        let mut response = self
            .client
            .db
            .query("SELECT * FROM review WHERE out = $business")
            .bind(("business", business_id.to_string()))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let values: Vec<Value> = response
            .take(0)
            .map_err(|e| DomainError::Repository(e.to_string()))?;
        Self::to_domain_vec(values)
    }
}
