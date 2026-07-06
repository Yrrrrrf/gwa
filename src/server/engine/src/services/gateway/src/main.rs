use gateway::infra::{
    app::create_app,
    config::AppConfig,
    setup::{init_app_state, init_tracing},
};
use tokio::net::TcpListener;

#[tokio::main]
async fn main() {
    // 1. Load config
    let config = AppConfig::from_env();

    // 2. Init tracing
    init_tracing();
    tracing::info!("Starting api on port {}", config.server_port);

    // 3. Init state (wiring)
    let state = init_app_state(&config).await;

    // 4. Create app router
    let app = create_app(state);

    // 5. Serve
    let addr = format!("0.0.0.0:{}", config.server_port);
    let listener = TcpListener::bind(&addr).await.unwrap();

    tracing::info!("Listening on {}", addr);
    axum::serve(listener, app).await.unwrap();
}
