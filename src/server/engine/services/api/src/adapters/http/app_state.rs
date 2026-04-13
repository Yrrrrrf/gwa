use domain::ports::auth::AuthRepository;
use domain::ports::business::BusinessRepository;
use domain::ports::review::ReviewRepository;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub auth_repo: Arc<dyn AuthRepository>,
    pub business_repo: Arc<dyn BusinessRepository>,
    pub review_repo: Arc<dyn ReviewRepository>,
    pub jwt_secret: String,
}
