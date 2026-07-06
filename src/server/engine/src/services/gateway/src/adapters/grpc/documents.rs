pub mod proto {
    tonic::include_proto!("template.v1");
}

use proto::document_service_client::DocumentServiceClient;
use tonic::transport::{Channel, Endpoint};

#[derive(Clone)]
pub struct DocumentClient {
    pub client: DocumentServiceClient<Channel>,
}

impl DocumentClient {
    pub async fn connect(dst: String) -> Result<Self, tonic::transport::Error> {
        let endpoint = Endpoint::from_shared(dst)?;
        let client = DocumentServiceClient::connect(endpoint).await?;
        Ok(Self { client })
    }
}
