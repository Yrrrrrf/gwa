use super::task::{Task, job};
use crate::{
    service::registry::Registry,
    shared::{contracts::system::JobResult, error::Fault},
};
use serde_json::Value;
use std::{collections::BTreeMap, sync::Arc, time::Duration};
use tokio::sync::{Mutex, mpsc};
use tokio_util::sync::CancellationToken;
type Jobs = Arc<Mutex<BTreeMap<String, JobResult>>>;
pub struct Queue {
    sender: mpsc::Sender<Task>,
    jobs: Jobs,
    retention: usize,
    cancellation: CancellationToken,
}
pub struct Runner {
    receiver: mpsc::Receiver<Task>,
    jobs: Jobs,
    registry: Arc<Registry>,
    timeout: Duration,
    cancellation: CancellationToken,
}
pub fn create(
    capacity: usize,
    retention: usize,
    registry: Arc<Registry>,
    timeout: Duration,
    cancellation: CancellationToken,
) -> (Queue, Runner) {
    let (sender, receiver) = mpsc::channel(capacity);
    let jobs = Arc::new(Mutex::new(BTreeMap::new()));
    (
        Queue {
            sender,
            jobs: jobs.clone(),
            retention,
            cancellation: cancellation.clone(),
        },
        Runner {
            receiver,
            jobs,
            registry,
            timeout,
            cancellation,
        },
    )
}
impl Queue {
    pub async fn enqueue(&self, operation: String, payload: Value) -> Result<String, Fault> {
        if self.cancellation.is_cancelled() {
            return Err(Fault::new("busy", "worker is stopping"));
        }
        let mut jobs = self.jobs.lock().await;
        if jobs.len() >= self.retention {
            let victim = jobs
                .iter()
                .find(|(_, v)| matches!(v.state.as_str(), "succeeded" | "failed"))
                .map(|(k, _)| k.clone());
            if let Some(victim) = victim {
                jobs.remove(&victim);
            } else {
                return Err(Fault::new("busy", "job retention is full"));
            }
        }
        let id = uuid::Uuid::new_v4().to_string();
        jobs.insert(id.clone(), job(id.clone()));
        if self
            .sender
            .try_send(Task {
                id: id.clone(),
                operation,
                payload,
            })
            .is_err()
        {
            jobs.remove(&id);
            return Err(Fault::new("busy", "worker queue is full or closed"));
        }
        Ok(id)
    }
    pub async fn get(&self, id: &str) -> Result<JobResult, Fault> {
        self.jobs
            .lock()
            .await
            .get(id)
            .cloned()
            .ok_or_else(|| Fault::new("not_found", "unknown job"))
    }
}
impl Runner {
    pub async fn run(mut self) {
        loop {
            let task = tokio::select! { biased; _=self.cancellation.cancelled()=>{self.receiver.close();break;},task=self.receiver.recv()=>task };
            match task {
                Some(task) => self.execute(task).await,
                None => return,
            }
        }
        while let Some(task) = self.receiver.recv().await {
            self.execute(task).await;
        }
    }
    async fn execute(&self, task: Task) {
        if let Some(job) = self.jobs.lock().await.get_mut(&task.id) {
            job.state = "running".into();
        }
        let result = tokio::time::timeout(
            self.timeout,
            self.registry.invoke(&task.operation, task.payload),
        )
        .await
        .unwrap_or_else(|_| Err(Fault::new("timeout", "operation timed out")));
        if let Some(job) = self.jobs.lock().await.get_mut(&task.id) {
            match result {
                Ok(value) => {
                    job.state = "succeeded".into();
                    job.result_json = value.to_string();
                }
                Err(error) => {
                    job.state = "failed".into();
                    job.error = error.to_string();
                }
            }
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::service::operation::Operation;
    struct Fail;
    #[async_trait::async_trait]
    impl Operation for Fail {
        fn name(&self) -> &'static str {
            "fail"
        }
        async fn execute(&self, _: Value) -> Result<Value, Fault> {
            Err(Fault::invalid("observable failure"))
        }
    }
    #[tokio::test]
    async fn admission_failure_and_shutdown_drain() {
        let mut registry = Registry::default();
        registry.register(Fail).unwrap();
        let cancel = CancellationToken::new();
        let (queue, runner) = create(
            1,
            4,
            Arc::new(registry),
            Duration::from_secs(1),
            cancel.clone(),
        );
        let id = queue.enqueue("fail".into(), Value::Null).await.unwrap();
        assert_eq!(
            queue
                .enqueue("fail".into(), Value::Null)
                .await
                .unwrap_err()
                .code,
            "busy"
        );
        cancel.cancel();
        assert!(queue.enqueue("fail".into(), Value::Null).await.is_err());
        runner.run().await;
        assert_eq!(queue.get(&id).await.unwrap().state, "failed");
        assert!(queue.get(&id).await.unwrap().error.contains("observable"));
    }
}
