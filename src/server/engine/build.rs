use std::{env, fs, path::PathBuf};
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let root = PathBuf::from("../config/contracts");
    let mut protos = Vec::new();
    for dir in fs::read_dir(&root)? {
        for entry in fs::read_dir(dir?.path())? {
            let path = entry?.path();
            if path.extension().is_some_and(|e| e == "proto") {
                protos.push(path);
            }
        }
    }
    protos.sort();
    for path in &protos {
        println!("cargo:rerun-if-changed={}", path.display());
    }
    println!("cargo:rerun-if-changed={}", root.display());
    if env::var_os("PROTOC").is_none() {
        // Build scripts run in a dedicated process before application threads exist.
        unsafe {
            env::set_var("PROTOC", protoc_bin_vendored::protoc_bin_path()?);
        }
    }
    tonic_prost_build::configure()
        .type_attribute(".", "#[derive(serde::Serialize, serde::Deserialize)]")
        .type_attribute(".", "#[serde(deny_unknown_fields)]")
        .compile_protos(&protos, &[root])?;
    Ok(())
}
