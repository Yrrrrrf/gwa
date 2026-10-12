use crate::shared::{
    config::Config,
    contracts::notify::{SendRequest, SendResult},
    error::Fault,
};
use std::path::PathBuf;
use uuid::Uuid;
pub enum Provider {
    File(PathBuf),
    Webhook {
        client: reqwest::Client,
        url: String,
    },
}
impl Provider {
    pub fn new(config: &Config) -> Result<Self, Fault> {
        match config.services.notify.provider.as_str() {
            "file" => Ok(Self::File(
                config.server.artifacts_dir.join("notifications"),
            )),
            "webhook" => Ok(Self::Webhook {
                client: reqwest::Client::builder()
                    .redirect(reqwest::redirect::Policy::none())
                    .timeout(std::time::Duration::from_secs(
                        config.server.operation_timeout_seconds,
                    ))
                    .build()
                    .map_err(Fault::internal)?,
                url: config.services.notify.webhook_url.clone(),
            }),
            _ => Err(Fault::invalid("unknown provider")),
        }
    }
    pub async fn send(&self, request: SendRequest) -> Result<SendResult, Fault> {
        let receipt = Uuid::new_v4().to_string();
        let provider = match self {
            Self::File(dir) => {
                tokio::fs::create_dir_all(dir)
                    .await
                    .map_err(Fault::internal)?;
                tokio::fs::write(
                    dir.join(format!("{receipt}.json")),
                    serde_json::to_vec(&request).map_err(Fault::internal)?,
                )
                .await
                .map_err(Fault::internal)?;
                "file"
            }
            Self::Webhook { client, url } => {
                client
                    .post(url)
                    .header("Idempotency-Key", &receipt)
                    .json(&request)
                    .send()
                    .await
                    .map_err(|error| Fault::internal(error.without_url()))?
                    .error_for_status()
                    .map_err(|error| Fault::internal(error.without_url()))?;
                "webhook"
            }
        };
        Ok(SendResult {
            receipt,
            provider: provider.into(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn provider_failure_is_reported_without_file_fallback() {
        let dir = tempfile::tempdir().unwrap();
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let router = axum::Router::new().route(
            "/",
            axum::routing::post(|| async { axum::http::StatusCode::INTERNAL_SERVER_ERROR }),
        );
        let server = tokio::spawn(async move {
            axum::serve(listener, router).await.unwrap();
        });
        let mut config = crate::shared::config::fixture();
        config.server.artifacts_dir = dir.path().to_path_buf();
        config.services.notify.provider = "webhook".into();
        config.services.notify.webhook_url = format!("http://{address}/");
        let provider = Provider::new(&config).unwrap();
        let result = provider
            .send(SendRequest {
                recipient: "test@example.test".into(),
                subject: "Test".into(),
                body: "Body".into(),
            })
            .await;
        server.abort();
        let _ = server.await;
        assert!(result.is_err());
        assert!(std::fs::read_dir(dir.path()).unwrap().next().is_none());
    }
}
