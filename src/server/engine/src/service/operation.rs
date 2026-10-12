use crate::shared::error::Fault;
use serde::{Serialize, de::DeserializeOwned};
use serde_json::Value;
#[async_trait::async_trait]
pub trait Operation: Send + Sync {
    fn name(&self) -> &'static str;
    async fn execute(&self, payload: Value) -> Result<Value, Fault>;
}
pub fn decode<T: DeserializeOwned>(value: Value) -> Result<T, Fault> {
    serde_json::from_value(value).map_err(|e| Fault::invalid(e.to_string()))
}
pub fn encode<T: Serialize>(value: T) -> Result<Value, Fault> {
    serde_json::to_value(value).map_err(Fault::internal)
}
pub fn required(values: &[&str]) -> Result<(), Fault> {
    if values.iter().any(|v| v.trim().is_empty()) {
        Err(Fault::invalid("all fields must be nonempty"))
    } else {
        Ok(())
    }
}
