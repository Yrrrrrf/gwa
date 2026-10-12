use crate::shared::context::Context;
use axum::{
    extract::{
        State,
        ws::{CloseFrame, Message, WebSocket, WebSocketUpgrade},
    },
    response::Response,
};
use serde::Deserialize;
use std::{sync::Arc, time::Duration};
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Auth {
    auth: String,
}
pub async fn upgrade(State(context): State<Arc<Context>>, upgrade: WebSocketUpgrade) -> Response {
    let max = context.config.server.max_body_bytes;
    upgrade
        .max_message_size(max)
        .max_frame_size(max)
        .on_upgrade(move |socket| {
            let sessions = context.sessions.clone();
            sessions.track_future(async move {
                tokio::select! { biased; _ = context.cancellation.cancelled() => {}, _ = serve(socket, context.clone()) => {} }
            })
        })
}
async fn close(socket: &mut WebSocket, code: u16, reason: &'static str) {
    let _ = socket
        .send(Message::Close(Some(CloseFrame {
            code,
            reason: reason.into(),
        })))
        .await;
}
async fn serve(mut socket: WebSocket, context: Arc<Context>) {
    let first = tokio::select! {_ = context.cancellation.cancelled()=>return, value=tokio::time::timeout(Duration::from_secs(5),socket.recv())=>value};
    let authenticated = match first {
        Ok(Some(Ok(Message::Text(text)))) => serde_json::from_str::<Auth>(&text)
            .is_ok_and(|auth| context.authorize(&auth.auth).is_ok()),
        _ => false,
    };
    if !authenticated {
        close(&mut socket, 1008, "authentication required").await;
        return;
    }
    if socket
        .send(Message::Text("{\"authenticated\":true}".into()))
        .await
        .is_err()
    {
        return;
    }
    loop {
        let message = tokio::select! {_ = context.cancellation.cancelled()=>{close(&mut socket,1001,"host stopping").await;return}, message=socket.recv()=>message};
        match message {
            Some(Ok(Message::Text(text))) => {
                if let Some(reply) = super::json_rpc::dispatch(&context, text.as_bytes()).await
                    && socket
                        .send(Message::Text(reply.to_string().into()))
                        .await
                        .is_err()
                {
                    return;
                }
            }
            Some(Ok(Message::Ping(bytes))) => {
                if socket.send(Message::Pong(bytes)).await.is_err() {
                    return;
                }
            }
            Some(Ok(Message::Pong(_))) => {}
            Some(Ok(Message::Binary(_))) => {
                close(&mut socket, 1003, "text messages required").await;
                return;
            }
            _ => return,
        }
    }
}
