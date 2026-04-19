use std::env;

#[derive(Clone)]
pub struct AppConfig {
    pub db_url: String,
    pub db_user: String,
    pub db_pass: String,
    pub db_ns: String,
    pub db_db: String,
    pub server_port: u16,
    pub jwt_secret: String,
    pub rpc_url: String,
}

impl AppConfig {
    pub fn from_env() -> Self {
        let surreal_port = env::var("SURREAL_PORT").unwrap_or_else(|_| "8000".to_string());
        let db_url = format!("ws://localhost:{}", surreal_port);

        Self {
            db_url,
            db_user: env::var("SURREAL_USER").unwrap_or_else(|_| "root".to_string()),
            db_pass: env::var("SURREAL_PASS").unwrap_or_else(|_| "root".to_string()),
            db_ns: env::var("SURREAL_NS").unwrap_or_else(|_| "template".to_string()),
            db_db: env::var("SURREAL_DB").unwrap_or_else(|_| "main".to_string()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "3000".to_string())
                .parse()
                .unwrap_or(3000),
            jwt_secret: env::var("JWT_SECRET").unwrap_or_else(|_| "super-secret-template-key-change-me-in-production".to_string()),
            rpc_url: env::var("RPC_URL").unwrap_or_else(|_| "http://localhost:4000".to_string()),
        }
    }
}
