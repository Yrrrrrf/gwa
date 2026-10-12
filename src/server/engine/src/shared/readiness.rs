use std::sync::atomic::{AtomicBool, Ordering};
#[derive(Default)]
pub struct Readiness(AtomicBool);
impl Readiness {
    pub fn set(&self, ready: bool) {
        self.0.store(ready, Ordering::Release);
    }
    pub fn get(&self) -> bool {
        self.0.load(Ordering::Acquire)
    }
}
