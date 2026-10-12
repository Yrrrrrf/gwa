use crate::shared::{context::Context, error::Fault};
use serde::Deserialize;
use serde_json::{Value, json};
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    jsonrpc: String,
    method: String,
    #[serde(default)]
    params: Value,
    #[serde(default)]
    id: Value,
}
fn error(id: Value, code: i32, message: &str, data: Option<&Fault>) -> Value {
    let mut value = json!({"jsonrpc":"2.0","id":id,"error":{"code":code,"message":message}});
    if let Some(data) = data {
        value["error"]["data"] = serde_json::to_value(data).expect("fault serialization");
    }
    value
}
async fn one(context: &Context, value: Value) -> Option<Value> {
    let notification = value.is_object() && value.get("id").is_none();
    let id = value.get("id").cloned().unwrap_or(Value::Null);
    let request: Request = match serde_json::from_value(value) {
        Ok(v) => v,
        Err(_) => return Some(error(id, -32600, "Invalid Request", None)),
    };
    if request.jsonrpc != "2.0"
        || !(request.id.is_null() || request.id.is_number() || request.id.is_string())
    {
        return Some(error(Value::Null, -32600, "Invalid Request", None));
    }
    let result = context.invoke(&request.method, request.params).await;
    if notification {
        return None;
    }
    Some(match result {
        Ok(value) => json!({"jsonrpc":"2.0","id":request.id,"result":value}),
        Err(fault) => error(
            request.id,
            match fault.code {
                "not_found" => -32601,
                "invalid" => -32602,
                _ => -32000,
            },
            &fault.message,
            Some(&fault),
        ),
    })
}
pub async fn dispatch(context: &Context, bytes: &[u8]) -> Option<Value> {
    let value: Value = match serde_json::from_slice(bytes) {
        Ok(v) => v,
        Err(_) => return Some(error(Value::Null, -32700, "Parse error", None)),
    };
    if let Value::Array(values) = value {
        if values.is_empty() {
            return Some(error(Value::Null, -32600, "Invalid Request", None));
        }
        let mut replies = Vec::new();
        for value in values {
            if let Some(reply) = one(context, value).await {
                replies.push(reply);
            }
        }
        if replies.is_empty() {
            None
        } else {
            Some(Value::Array(replies))
        }
    } else {
        one(context, value).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{sync::Arc, time::Duration};
    use tokio_util::sync::CancellationToken;
    #[tokio::test]
    async fn explicit_null_id_is_a_request() {
        let config = crate::shared::config::fixture();
        let registry = Arc::new(crate::service::registry(&config).unwrap());
        let cancellation = CancellationToken::new();
        let (queue, _runner) = crate::worker::runner::create(
            1,
            2,
            registry.clone(),
            Duration::from_secs(1),
            cancellation.clone(),
        );
        let context = Context::new(config, registry, queue, cancellation, "test".into());
        let reply = dispatch(
            &context,
            br#"{"jsonrpc":"2.0","id":null,"method":"missing"}"#,
        )
        .await
        .unwrap();
        assert_eq!(reply["id"], Value::Null);
        assert_eq!(reply["error"]["code"], -32601);
        assert!(
            dispatch(&context, br#"{"jsonrpc":"2.0","method":"missing"}"#)
                .await
                .is_none()
        );
    }
}
