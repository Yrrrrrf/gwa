use crate::shared::{
    context::Context,
    contracts::system::{InvokeRequest, InvokeResult, capabilities_server::Capabilities},
    error::Fault,
};
use std::sync::Arc;
use tonic::{Request, Response, Status};
pub struct Adapter(pub Arc<Context>);
fn status(fault: Fault) -> Status {
    match fault.code {
        "invalid" => Status::invalid_argument(fault.message),
        "unauthorized" => Status::unauthenticated(fault.message),
        "not_found" => Status::not_found(fault.message),
        "busy" => Status::unavailable(fault.message),
        "timeout" => Status::deadline_exceeded(fault.message),
        _ => Status::internal(fault.message),
    }
}
#[tonic::async_trait]
impl Capabilities for Adapter {
    async fn invoke(
        &self,
        request: Request<InvokeRequest>,
    ) -> Result<Response<InvokeResult>, Status> {
        self.0
            .bearer(
                request
                    .metadata()
                    .get("authorization")
                    .and_then(|v| v.to_str().ok()),
            )
            .map_err(status)?;
        let request = request.into_inner();
        let payload = serde_json::from_str(&request.payload_json)
            .map_err(|e| Status::invalid_argument(e.to_string()))?;
        let result = self
            .0
            .invoke(&request.operation, payload)
            .await
            .map_err(status)?;
        Ok(Response::new(InvokeResult {
            result_json: result.to_string(),
        }))
    }
}
