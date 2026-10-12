use super::operation::Operation;
use crate::shared::error::Fault;
use serde_json::Value;
use std::{collections::BTreeMap, sync::Arc};
#[derive(Default)]
pub struct Registry {
    entries: BTreeMap<&'static str, Arc<dyn Operation>>,
}
impl Registry {
    pub fn register(&mut self, operation: impl Operation + 'static) -> Result<(), Fault> {
        let name = operation.name();
        if name.starts_with("system.") || self.entries.contains_key(name) {
            return Err(Fault::invalid(format!(
                "duplicate or reserved operation: {name}"
            )));
        }
        self.entries.insert(name, Arc::new(operation));
        Ok(())
    }
    pub fn names(&self) -> Vec<&'static str> {
        self.entries.keys().copied().collect()
    }
    pub fn contains(&self, name: &str) -> bool {
        self.entries.contains_key(name)
    }
    pub async fn invoke(&self, name: &str, value: Value) -> Result<Value, Fault> {
        let operation = self
            .entries
            .get(name)
            .ok_or_else(|| Fault::new("not_found", "unknown operation"))?;
        operation.execute(value).await
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    struct Echo;
    #[async_trait::async_trait]
    impl Operation for Echo {
        fn name(&self) -> &'static str {
            "echo"
        }
        async fn execute(&self, v: Value) -> Result<Value, Fault> {
            Ok(v)
        }
    }
    #[tokio::test]
    async fn duplicate_and_unknown() {
        let mut r = Registry::default();
        r.register(Echo).unwrap();
        assert!(r.register(Echo).is_err());
        assert_eq!(
            r.invoke("missing", Value::Null).await.unwrap_err().code,
            "not_found"
        );
    }
}
