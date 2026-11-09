fn main() {
    println!("cargo:rerun-if-changed=icons/icon.png");
    if matches!(std::env::var("CARGO_CFG_TARGET_OS").as_deref(), Ok("windows")) {
        println!("cargo:rerun-if-changed=icons/icon.ico");
    }
    tauri_build::build();
}
