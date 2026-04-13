use async_graphql::{InputObject, SimpleObject};
use domain::entities::user::User;

#[derive(SimpleObject)]
pub struct UserType {
    pub id: String,
    pub email: String,
    pub role: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<User> for UserType {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            email: user.email,
            role: format!("{:?}", user.role).to_lowercase(),
            created_at: user.created_at,
        }
    }
}

#[derive(SimpleObject)]
pub struct AuthPayload {
    pub token: String,
    pub user: UserType,
}

#[derive(InputObject)]
pub struct LoginInput {
    pub email: String,
    pub password: String,
}
