fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_prost_build::configure()
        .build_server(false) // Gateway is a client for now
        .compile_protos(
            &[
                "../../../proto/template/v1/common.proto",
                "../../../proto/template/v1/notify.proto",
                "../../../proto/template/v1/documents.proto",
            ],
            &["../../../proto"],
        )?;
    Ok(())
}
