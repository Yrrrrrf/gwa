use super::Result;
use crate::entities::user::{Session, User};
use async_trait::async_trait;

#[async_trait]
pub trait AuthRepository: Send + Sync {
    async fn find_user_by_email(&self, email: &str) -> Result<Option<User>>;
    async fn find_user_by_id(&self, id: &str) -> Result<Option<User>>;
    async fn create_session(&self, session: Session) -> Result<()>;
    async fn find_session_by_token(&self, token: &str) -> Result<Option<Session>>;
    async fn delete_session(&self, token: &str) -> Result<()>;
}
