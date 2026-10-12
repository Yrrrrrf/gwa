use crate::shared::contracts::system::JobResult;
use serde_json::Value;
pub struct Task {
    pub id: String,
    pub operation: String,
    pub payload: Value,
}
pub fn job(id: String) -> JobResult {
    JobResult {
        job_id: id,
        state: "queued".into(),
        result_json: String::new(),
        error: String::new(),
    }
}
