use super::error::Fault;
use serde::Deserialize;
use std::{net::SocketAddr, path::PathBuf};
#[derive(Clone, Deserialize)]
pub struct Config {
    pub server: Server,
    pub worker: Worker,
    pub auth: Auth,
    pub services: Services,
    pub profile: Profile,
}
#[derive(Clone, Deserialize)]
pub struct Server {
    pub http_bind: SocketAddr,
    pub grpc_bind: SocketAddr,
    pub max_body_bytes: usize,
    pub operation_timeout_seconds: u64,
    pub shutdown_timeout_seconds: u64,
    pub artifacts_dir: PathBuf,
}
#[derive(Clone, Deserialize)]
pub struct Worker {
    pub capacity: usize,
    pub retained_jobs: usize,
}
#[derive(Clone, Deserialize)]
pub struct Auth {
    pub token_env: String,
}
#[derive(Clone, Deserialize)]
pub struct Services {
    pub notify: Notify,
    pub report: Report,
}
#[derive(Clone, Deserialize)]
pub struct Notify {
    pub enabled: bool,
    pub provider: String,
    pub webhook_url: String,
}
#[derive(Clone, Deserialize)]
pub struct Report {
    pub enabled: bool,
}
#[derive(Clone, Deserialize)]
pub struct Profile {
    pub name: String,
    pub log_format: String,
}
impl Config {
    pub fn load(path: &str) -> Result<Self, Fault> {
        let text = std::fs::read_to_string(path).map_err(Fault::internal)?;
        let config: Self = toml::from_str(&text).map_err(Fault::internal)?;
        config.validate()?;
        Ok(config)
    }
    pub fn validate(&self) -> Result<(), Fault> {
        if !["dev", "prod"].contains(&self.profile.name.as_str()) {
            return Err(Fault::invalid("profile must be dev or prod"));
        }
        if !["pretty", "json"].contains(&self.profile.log_format.as_str()) {
            return Err(Fault::invalid("unknown log format"));
        }
        if self.server.http_bind == self.server.grpc_bind
            || self.server.http_bind.port() == 0
            || self.server.grpc_bind.port() == 0
        {
            return Err(Fault::invalid("distinct nonzero listener ports required"));
        }
        if self.server.max_body_bytes == 0
            || self.server.operation_timeout_seconds == 0
            || self.server.shutdown_timeout_seconds == 0
            || self.worker.capacity == 0
            || self.worker.retained_jobs < self.worker.capacity
        {
            return Err(Fault::invalid("invalid limits"));
        }
        if !self.server.artifacts_dir.is_absolute() {
            return Err(Fault::invalid("artifact path must be absolute"));
        }
        if self.auth.token_env.is_empty() {
            return Err(Fault::invalid("token environment name required"));
        }
        if !["file", "webhook"].contains(&self.services.notify.provider.as_str()) {
            return Err(Fault::invalid("unknown notify provider"));
        }
        if self.services.notify.provider == "webhook" {
            let url = reqwest::Url::parse(&self.services.notify.webhook_url)
                .map_err(|_| Fault::invalid("invalid webhook URL"))?;
            if !["http", "https"].contains(&url.scheme())
                || (self.profile.name == "prod" && url.scheme() != "https")
            {
                return Err(Fault::invalid("production webhook requires HTTPS"));
            }
        }
        Ok(())
    }
    pub fn token(&self) -> Result<String, Fault> {
        let token = std::env::var(&self.auth.token_env)
            .map_err(|_| Fault::invalid("configured API token is missing"))?;
        self.validate_token(&token)?;
        Ok(token)
    }
    fn validate_token(&self, token: &str) -> Result<(), Fault> {
        if token.trim().is_empty()
            || token.contains(['\n', '\r'])
            || (self.profile.name == "prod" && token.len() < 24)
        {
            return Err(Fault::invalid("invalid API token"));
        }
        Ok(())
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn invalid_profile_and_limits() {
        let mut c = fixture();
        assert!(c.validate().is_ok());
        c.services.notify.enabled = false;
        c.services.report.enabled = false;
        assert!(crate::service::registry(&c).unwrap().names().is_empty());
        c.worker.capacity = 0;
        assert!(c.validate().is_err());
        c.worker.capacity = 32;
        c.profile.name = "test".into();
        assert!(c.validate().is_err());
    }
}

#[cfg(test)]
pub fn fixture() -> Config {
    let text = format!(
        "{}\n{}\n{}",
        include_str!("../../../config/server.toml"),
        include_str!("../../../config/services.toml"),
        include_str!("../../../config/profiles/dev.toml")
    );
    toml::from_str(&text).unwrap()
}
#[cfg(test)]
mod production_tests {
    use super::*;
    #[test]
    fn production_token_and_provider_constraints() {
        let mut config = fixture();
        config.profile.name = "prod".into();
        assert!(config.validate_token("").is_err());
        assert!(config.validate_token("too-short").is_err());
        assert!(
            config
                .validate_token("explicit-production-token-123")
                .is_ok()
        );
        config.services.notify.provider = "unknown".into();
        assert!(config.validate().is_err());
        config.services.notify.provider = "webhook".into();
        config.services.notify.webhook_url = "http://example.test".into();
        assert!(config.validate().is_err());
    }
}
