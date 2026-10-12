use super::provider::Provider;
use crate::{
    service::operation::{Operation, decode, encode, required},
    shared::{config::Config, contracts::notify::SendRequest, error::Fault},
};
use serde_json::Value;
pub struct Send {
    provider: Provider,
}
impl Send {
    pub fn new(config: &Config) -> Result<Self, Fault> {
        Ok(Self {
            provider: Provider::new(config)?,
        })
    }
}
#[async_trait::async_trait]
impl Operation for Send {
    fn name(&self) -> &'static str {
        "notify.send"
    }
    async fn execute(&self, payload: Value) -> Result<Value, Fault> {
        let request: SendRequest = decode(payload)?;
        required(&[&request.recipient, &request.subject, &request.body])?;
        encode(self.provider.send(request).await?)
    }
}
