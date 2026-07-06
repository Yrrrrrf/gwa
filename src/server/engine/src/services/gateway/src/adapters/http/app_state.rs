use crate::adapters::graphql::AppSchema;
use crate::adapters::grpc::documents::DocumentClient;
use crate::adapters::grpc::notifier::NotifierClient;
use domain::ports::auth::AuthRepository;
use domain::ports::item::ItemRepository;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub auth_repo: Arc<dyn AuthRepository>,
    pub item_repo: Arc<dyn ItemRepository>,
    pub jwt_secret: String,
    pub schema: AppSchema,
    pub notifier_client: NotifierClient,
    pub document_client: DocumentClient,
}
