use async_graphql::{InputObject, SimpleObject};
use domain::entities::comment::Comment;

#[derive(SimpleObject)]
pub struct CommentType {
    pub id: String,
    pub user_id: String,
    pub item_id: String,
    pub rating: i32,
    pub body: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

impl From<Comment> for CommentType {
    fn from(c: Comment) -> Self {
        Self {
            id: c.id,
            user_id: c.user_id,
            item_id: c.item_id,
            rating: c.rating,
            body: c.body,
            created_at: c.created_at,
        }
    }
}

#[derive(InputObject)]
pub struct AddCommentInput {
    pub item_id: String,
    pub rating: i32,
    pub body: Option<String>,
}
