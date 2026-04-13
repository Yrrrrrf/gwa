use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Review {
    pub id: String,
    #[serde(rename = "in")]
    pub user: String, // record<user>
    #[serde(rename = "out")]
    pub business: String, // record<business>
    pub rating: i32,
    pub body: Option<String>,
    pub locale: String,
    pub created_at: DateTime<Utc>,
}
