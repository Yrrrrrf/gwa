use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum PriceRange {
    #[serde(rename = "$")]
    Budget,
    #[serde(rename = "$$")]
    Mid,
    #[serde(rename = "$$$")]
    Luxury,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Point {
    #[serde(rename = "type")]
    pub kind: String, // "Point"
    pub coordinates: (f64, f64), // [longitude, latitude]
}

impl Point {
    pub fn new(longitude: f64, latitude: f64) -> Self {
        Self {
            kind: "Point".to_string(),
            coordinates: (longitude, latitude),
        }
    }

    pub fn longitude(&self) -> f64 {
        self.coordinates.0
    }

    pub fn latitude(&self) -> f64 {
        self.coordinates.1
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Business {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub description: Option<String>,
    pub category: String, // record<category>
    pub city: String,     // record<city>
    pub coordinates: Point,
    pub address: Option<String>,
    pub neighborhood: Option<String>,
    pub price_range: PriceRange,
    pub languages_spoken: Vec<String>,
    pub phone: Option<String>,
    pub website: Option<String>,
    pub opening_hours: Option<String>,
    pub is_active: bool,
    pub is_verified: bool,
    pub is_ola_mexico: bool,
    pub rating: Option<f64>,
    pub review_count: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
