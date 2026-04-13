use crate::client::SurrealClient;
use async_trait::async_trait;
use domain::entities::user::{Session, User};
use domain::ports::DomainError;
use domain::ports::Result as DomainResult;
use domain::ports::auth::AuthRepository;
use serde_json;
use surrealdb_types::RecordId;
use surrealdb_types::SurrealValue;
use surrealdb_types::Value;

pub struct SurrealAuthRepo {
    client: SurrealClient,
}

impl SurrealAuthRepo {
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
}

#[async_trait]
impl AuthRepository for SurrealAuthRepo {
    async fn find_user_by_email(&self, email: &str) -> DomainResult<Option<User>> {
        let mut response = self
            .client
            .db
            .query("SELECT * FROM user WHERE email = $email")
            .bind(("email", email.to_string()))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let value: Option<Value> = response
            .take(0)
            .map_err(|e| DomainError::Repository(e.to_string()))?;
        value.map(Self::to_domain).transpose()
    }

    async fn find_user_by_id(&self, id: &str) -> DomainResult<Option<User>> {
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

    async fn create_session(&self, session: Session) -> DomainResult<()> {
        let surreal_value = Self::from_domain(session)?;

        self.client
            .db
            .create::<Option<Value>>("session")
            .content(surreal_value)
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        Ok(())
    }

    async fn find_session_by_token(&self, token: &str) -> DomainResult<Option<Session>> {
        let mut response = self
            .client
            .db
            .query("SELECT * FROM session WHERE token = $token")
            .bind(("token", token.to_string()))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        let value: Option<Value> = response
            .take(0)
            .map_err(|e| DomainError::Repository(e.to_string()))?;
        value.map(Self::to_domain).transpose()
    }

    async fn delete_session(&self, token: &str) -> DomainResult<()> {
        self.client
            .db
            .query("DELETE FROM session WHERE token = $token")
            .bind(("token", token.to_string()))
            .await
            .map_err(|e| DomainError::Repository(e.to_string()))?;

        Ok(())
    }
}
