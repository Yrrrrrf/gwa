use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comment {
    pub id: String,
    pub user_id: String,
    pub item_id: String,
    pub rating: i32,
    pub body: Option<String>,
    pub created_at: DateTime<Utc>,
}
