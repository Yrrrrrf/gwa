use crate::{
    service::operation::{Operation, decode, encode, required},
    shared::{
        config::Config,
        contracts::report::{GenerateRequest, GenerateResult},
        error::Fault,
    },
};
use serde_json::Value;
use std::path::PathBuf;
use uuid::Uuid;
pub struct Generate {
    directory: PathBuf,
}
impl Generate {
    pub fn new(config: &Config) -> Self {
        Self {
            directory: config.server.artifacts_dir.join("reports"),
        }
    }
}
#[async_trait::async_trait]
impl Operation for Generate {
    fn name(&self) -> &'static str {
        "report.generate"
    }
    async fn execute(&self, payload: Value) -> Result<Value, Fault> {
        let request: GenerateRequest = decode(payload)?;
        required(&[&request.title, &request.content, &request.format])?;
        let (body, extension, mime) = super::renderer::render(&request)?;
        tokio::fs::create_dir_all(&self.directory)
            .await
            .map_err(Fault::internal)?;
        let artifact_id = format!("{}.{}", Uuid::new_v4(), extension);
        tokio::fs::write(self.directory.join(&artifact_id), body.as_bytes())
            .await
            .map_err(Fault::internal)?;
        encode(GenerateResult {
            artifact_id,
            content_type: mime.into(),
            bytes: body.len() as u64,
        })
    }
}
