use super::{
    config::Config,
    contracts::system::{EnqueueRequest, EnqueueResult, JobRequest},
    error::Fault,
    readiness::Readiness,
};
use crate::{
    service::{
        operation::{decode, encode, required},
        registry::Registry,
    },
    worker::runner::Queue,
};
use serde_json::Value;
use std::{sync::Arc, time::Duration};
use subtle::ConstantTimeEq;
use tokio_util::sync::CancellationToken;
pub struct Context {
    pub config: Config,
    pub registry: Arc<Registry>,
    pub queue: Queue,
    pub ready: Readiness,
    pub cancellation: CancellationToken,
    pub sessions: tokio_util::task::TaskTracker,
    token: String,
}
impl Context {
    pub fn new(
        config: Config,
        registry: Arc<Registry>,
        queue: Queue,
        cancellation: CancellationToken,
        token: String,
    ) -> Self {
        Self {
            config,
            registry,
            queue,
            ready: Readiness::default(),
            cancellation,
            token,
            sessions: tokio_util::task::TaskTracker::new(),
        }
    }
    pub fn authorize(&self, token: &str) -> Result<(), Fault> {
        if bool::from(token.as_bytes().ct_eq(self.token.as_bytes())) {
            Ok(())
        } else {
            Err(Fault::new("unauthorized", "invalid API token"))
        }
    }
    pub fn bearer(&self, header: Option<&str>) -> Result<(), Fault> {
        self.authorize(header.and_then(|h| h.strip_prefix("Bearer ")).unwrap_or(""))
    }
    pub fn names(&self) -> Vec<&'static str> {
        let mut names = self.registry.names();
        names.extend(["system.enqueue", "system.job"]);
        names.sort();
        names
    }
    pub async fn invoke(&self, name: &str, payload: Value) -> Result<Value, Fault> {
        if self.cancellation.is_cancelled() {
            return Err(Fault::new("busy", "host is stopping"));
        }
        let operation = async {
            match name {
                "system.enqueue" => {
                    let request: EnqueueRequest = decode(payload)?;
                    required(&[&request.operation, &request.payload_json])?;
                    if !self.registry.contains(&request.operation) {
                        return Err(Fault::new("not_found", "unknown operation"));
                    }
                    let value = serde_json::from_str(&request.payload_json)
                        .map_err(|e| Fault::invalid(e.to_string()))?;
                    encode(EnqueueResult {
                        job_id: self.queue.enqueue(request.operation, value).await?,
                    })
                }
                "system.job" => {
                    let request: JobRequest = decode(payload)?;
                    required(&[&request.job_id])?;
                    encode(self.queue.get(&request.job_id).await?)
                }
                _ => self.registry.invoke(name, payload).await,
            }
        };
        tokio::time::timeout(
            Duration::from_secs(self.config.server.operation_timeout_seconds),
            operation,
        )
        .await
        .unwrap_or_else(|_| Err(Fault::new("timeout", "operation timed out")))
    }
}
