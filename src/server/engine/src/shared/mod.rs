pub mod config;
pub mod context;
pub mod error;
pub mod readiness;
pub mod shutdown;
pub mod telemetry;
pub mod contracts {
    pub mod notify {
        tonic::include_proto!("gwa.notify");
    }
    pub mod report {
        tonic::include_proto!("gwa.report");
    }
    pub mod system {
        tonic::include_proto!("gwa.system");
    }
}
