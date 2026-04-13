pub mod adapters;
pub mod infra;

pub use adapters::http::app_error_impl::WebError;
pub use application::error::{AppError, AppResult as BaseAppResult};

pub type AppResult<T> = Result<T, WebError>;
