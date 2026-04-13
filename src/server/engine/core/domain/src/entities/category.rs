use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub icon: Option<String>,
    pub description: Option<String>,
    pub parent: Option<String>, // record<category>
    pub path: String,           // VALUE field in DB
    pub created_at: DateTime<Utc>,
}
