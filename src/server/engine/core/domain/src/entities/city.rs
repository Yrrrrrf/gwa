use super::business::Point;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct City {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub country_code: String,
    pub coordinates: Point,
    pub is_venue_city: bool,
    pub created_at: DateTime<Utc>,
}
