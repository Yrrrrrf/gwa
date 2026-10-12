use gwa_server::{
    api, service,
    shared::{
        config::Config, context::Context,
        contracts::system::capabilities_server::CapabilitiesServer, shutdown, telemetry,
    },
    worker,
};
use std::{sync::Arc, time::Duration};
use tokio::{net::TcpListener, task::JoinSet};
use tokio_util::sync::CancellationToken;
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let path = std::env::var("GWA_CONFIG")?;
    let config = Config::load(&path)?;
    let token = config.token()?;
    telemetry::init(&config.profile.log_format);
    let registry = Arc::new(service::registry(&config)?);
    let cancellation = CancellationToken::new();
    let (queue, runner) = worker::runner::create(
        config.worker.capacity,
        config.worker.retained_jobs,
        registry.clone(),
        Duration::from_secs(config.server.operation_timeout_seconds),
        cancellation.clone(),
    );
    let http = TcpListener::bind(config.server.http_bind).await?;
    let grpc = TcpListener::bind(config.server.grpc_bind).await?;
    let context = Arc::new(Context::new(
        config.clone(),
        registry,
        queue,
        cancellation.clone(),
        token,
    ));
    // All long-lived futures are owned directly by this JoinSet; no nested detached handles.
    let mut components: JoinSet<Result<(), String>> = JoinSet::new();
    let stop = cancellation.clone();
    let router = api::http::router(context.clone());
    components.spawn(async move {
        axum::serve(http, router)
            .with_graceful_shutdown(stop.cancelled_owned())
            .await
            .map_err(|e| e.to_string())
    });
    let stop = cancellation.clone();
    let adapter = CapabilitiesServer::new(api::grpc::Adapter(context.clone()))
        .max_decoding_message_size(config.server.max_body_bytes)
        .max_encoding_message_size(config.server.max_body_bytes);
    components.spawn(async move {
        tonic::transport::Server::builder()
            .add_service(adapter)
            .serve_with_incoming_shutdown(
                tokio_stream::wrappers::TcpListenerStream::new(grpc),
                stop.cancelled_owned(),
            )
            .await
            .map_err(|e| e.to_string())
    });
    components.spawn(async move {
        runner.run().await;
        Ok(())
    });
    context.ready.set(true);
    tracing::info!("capability host ready");
    let mut failure = None;
    tokio::select! {
     signal=shutdown::signal()=>{if let Err(e)=signal{failure=Some(e.to_string());}},
     result=components.join_next()=>{failure=Some(format!("component exited unexpectedly: {result:?}"));},
    }
    context.ready.set(false);
    cancellation.cancel();
    let drain = async {
        while let Some(result) = components.join_next().await {
            match result {
                Ok(Ok(())) => {}
                other => {
                    failure.get_or_insert_with(|| format!("shutdown component failure: {other:?}"));
                }
            }
        }
        context.sessions.close();
        context.sessions.wait().await;
    };
    if tokio::time::timeout(
        Duration::from_secs(config.server.shutdown_timeout_seconds),
        drain,
    )
    .await
    .is_err()
    {
        components.abort_all();
        while components.join_next().await.is_some() {}
        failure.get_or_insert_with(|| "shutdown deadline exceeded".into());
    }
    if let Some(error) = failure {
        return Err(error.into());
    }
    Ok(())
}
