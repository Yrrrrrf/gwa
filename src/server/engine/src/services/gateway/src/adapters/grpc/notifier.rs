pub mod proto {
    tonic::include_proto!("template.v1");
}

use proto::notifier_service_client::NotifierServiceClient;
use tonic::transport::{Channel, Endpoint};

#[derive(Clone)]
pub struct NotifierClient {
    pub client: NotifierServiceClient<Channel>,
}

impl NotifierClient {
    pub async fn connect(dst: String) -> Result<Self, tonic::transport::Error> {
        let endpoint = Endpoint::from_shared(dst)?;
        let client = NotifierServiceClient::connect(endpoint).await?;
        Ok(Self { client })
    }
}
