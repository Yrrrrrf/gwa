use std::sync::Arc;
use surrealdb::engine::any::connect;
use surrealdb::opt::auth::Root;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::adapters::http::app_state::AppState;
use crate::infra::config::AppConfig;
use store::client::SurrealClient;
use store::repos::auth::SurrealAuthRepo;
use store::repos::business::SurrealBusinessRepo;
use store::repos::review::SurrealReviewRepo;

pub fn init_tracing() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info,api=debug,store=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();
}

pub async fn init_app_state(config: &AppConfig) -> AppState {
    let db = connect(&config.db_url)
        .await
        .expect("Failed to connect to SurrealDB");

    db.signin(Root {
        username: config.db_user.clone(),
        password: config.db_pass.clone(),
    })
    .await
    .expect("Failed to sign in to SurrealDB");

    db.use_ns(&config.db_ns)
        .use_db(&config.db_db)
        .await
        .expect("Failed to use namespace/db");

    let surreal_client = SurrealClient::new(Arc::new(db));

    let auth_repo = Arc::new(SurrealAuthRepo::new(surreal_client.clone()));
    let business_repo = Arc::new(SurrealBusinessRepo::new(surreal_client.clone()));
    let review_repo = Arc::new(SurrealReviewRepo::new(surreal_client));

    AppState {
        auth_repo,
        business_repo,
        review_repo,
        jwt_secret: config.jwt_secret.clone(),
    }
}
