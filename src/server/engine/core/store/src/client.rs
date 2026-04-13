use std::sync::Arc;
use surrealdb::Surreal;
use surrealdb::engine::any::Any;

#[derive(Clone)]
pub struct SurrealClient {
    pub db: Arc<Surreal<Any>>,
}

impl SurrealClient {
    pub fn new(db: Arc<Surreal<Any>>) -> Self {
        Self { db }
    }
}
