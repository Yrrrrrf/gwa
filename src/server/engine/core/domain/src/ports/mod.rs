pub mod auth;
pub mod item;

use std::fmt;

#[derive(Debug)]
pub enum DomainError {
    Repository(String),
    NotFound(String),
    Internal(String),
}

impl fmt::Display for DomainError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Repository(msg) => write!(f, "Repository error: {}", msg),
            Self::NotFound(msg) => write!(f, "Not found: {}", msg),
            Self::Internal(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}
impl std::error::Error for DomainError {}

pub type Result<T> = std::result::Result<T, DomainError>;
