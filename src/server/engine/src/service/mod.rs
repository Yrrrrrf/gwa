pub mod files;
pub mod notify;
pub mod operation;
pub mod registry;
use crate::shared::{config::Config, error::Fault};
use registry::Registry;
// The single capability registration point. Adapters never name service implementations.
pub fn registry(config: &Config) -> Result<Registry, Fault> {
    let mut registry = Registry::default();
    if config.services.notify.enabled {
        registry.register(notify::send::Send::new(config)?)?;
    }
    if config.services.report.enabled {
        registry.register(files::generate::Generate::new(config))?;
    }
    Ok(registry)
}
