use std::{fs, path::Path};

use anyhow::{Result, bail};
use tempfile::TempDir;

use crate::{
    files, platform,
    project::{self, App},
};

fn write(root: &Path, path: &str, contents: &str) -> Result<()> {
    files::write_changed(&root.join(path), contents.as_bytes())?;
    Ok(())
}

fn fixture() -> Result<(TempDir, App)> {
    let root = TempDir::new()?;
    let path = root.path();
    write(
        path,
        "apps/minimal/deno.json",
        r#"{"version":"0.3.2","authors":["Fernando"]}"#,
    )?;
    write(path, "apps/minimal/icon.svg", "<svg/>")?;
    for (relative, contents) in [
        ("Cargo.toml", include_str!("../../host/Cargo.toml")),
        ("Cargo.lock", include_str!("../../host/Cargo.lock")),
        ("build.rs", include_str!("../../host/build.rs")),
        ("src/main.rs", include_str!("../../host/src/main.rs")),
        ("src/lib.rs", include_str!("../../host/src/lib.rs")),
        (
            "tauri.conf.json",
            include_str!("../../host/tauri.conf.json"),
        ),
    ] {
        write(path, &format!("native/host/{relative}"), contents)?;
    }
    let app = App::open(dunce::canonicalize(path)?, "minimal".into())?;
    Ok((root, app))
}

#[test]
fn app_local_settings_preserve_aliases_and_validate_identity() -> Result<()> {
    let (root, _) = fixture()?;
    let path = root.path();
    write(
        path,
        "apps/svelte/deno.json",
        r#"{"version":"1.0.0","native":{"slug":"vision","identifier":"dev.yrrrrrf.gwa.vision","productName":"GWA Svelte","frontendDist":"dist"}}"#,
    )?;
    let app = App::open(dunce::canonicalize(path)?, "vision".into())?;
    assert!(app.directory.ends_with("apps/svelte"));
    assert!(app.dist.ends_with("svelte/dist"));

    write(
        path,
        "apps/svelte/deno.json",
        r#"{"version":"1.0.0","native":{"slug":"vision","identifier":"dev.yrrrrrf.gwa.minimal","frontendDist":"dist"}}"#,
    )?;
    assert!(
        project::registry(path)
            .unwrap_err()
            .to_string()
            .contains("Duplicate")
    );
    write(
        path,
        "apps/svelte/deno.json",
        r#"{"version":"1.0.0","native":{"slug":"vision","identifier":"dev.yrrrrrf.gwa.vision","frontendDist":"../../dist"}}"#,
    )?;
    assert!(
        App::open(dunce::canonicalize(path)?, "vision".into())
            .unwrap_err()
            .to_string()
            .contains("stay inside")
    );
    Ok(())
}

#[test]
fn materialize_preserves_generated_native_library_and_signing() -> Result<()> {
    let (root, mut app) = fixture()?;
    app.materialize()?;
    assert!(app.icon()?.ends_with("apps/minimal/icon.svg"));
    let manifest = app.host.join("Cargo.toml");
    let current = fs::read_to_string(&manifest)?;
    fs::write(
        &manifest,
        current.replace("gwa_native_lib", "existing_mobile_lib"),
    )?;
    write(
        root.path(),
        "native/projects/minimal/src-tauri/gen/apple/Signing.xcconfig",
        "local team settings",
    )?;

    app.materialize()?;
    assert!(fs::read_to_string(&manifest)?.contains("existing_mobile_lib"));
    assert!(
        fs::read_to_string(app.host.join("src/main.rs"))?.contains("existing_mobile_lib::run()")
    );
    assert!(
        fs::read_to_string(app.host.join("Cargo.lock"))?
            .contains("name = \"gwa-minimal\"\nversion = \"0.3.2\"")
    );
    assert_eq!(
        fs::read_to_string(app.host.join("gen/apple/Signing.xcconfig"))?,
        "local team settings"
    );
    let config = app.config()?;
    assert!(
        config["build"]["beforeDevCommand"]["script"]
            .as_str()
            .unwrap()
            .starts_with("cargo run ")
    );
    assert_eq!(config["identifier"], "dev.yrrrrrf.gwa.minimal");
    app.entry.identifier = "dev.example.changed".into();
    assert!(
        app.materialize()
            .unwrap_err()
            .to_string()
            .contains("identity changed")
    );
    Ok(())
}

const ANDROID_TASK: &str = "src-tauri/gen/android/buildSrc/src/main/kotlin/BuildTask.kt";
const APPLE_YML: &str = "src-tauri/gen/apple/project.yml";
const PBXPROJ: &str = "src-tauri/gen/apple/GWA.xcodeproj/project.pbxproj";
const DENO_BRIDGE: &str = r#"{"workspace":[],"nodeModulesDir":"auto","tasks":{"tauri":"deno run -A npm:@tauri-apps/cli@2.12.1"}}"#;
const GRADLE_CALLBACK: &str = r#"
val executable = """deno""";
val args = listOf("task", "tauri", "android", "android-studio-script");
val keep = "gradle customization"
"#;

#[test]
fn migrate_existing_gradle_and_xcode_callbacks_in_place() -> Result<()> {
    let root = TempDir::new()?;
    let project = root.path();
    write(project, ANDROID_TASK, GRADLE_CALLBACK)?;
    write(
        project,
        APPLE_YML,
        "deno task tauri ios xcode-script -v\nDEVELOPMENT_TEAM: keep\n",
    )?;
    write(
        project,
        PBXPROJ,
        "shellScript = \"deno task tauri ios xcode-script -v\";\n",
    )?;
    write(project, "deno.json", DENO_BRIDGE)?;
    platform::migrate_callbacks(project, &[platform::Target::Android, platform::Target::Ios])?;
    assert!(!project.join("deno.json").exists());
    let android = fs::read_to_string(project.join(ANDROID_TASK))?;
    assert!(android.contains(r#""""cargo""""#));
    assert!(android.contains(r#"listOf("tauri", "android", "android-studio-script")"#));
    assert!(android.contains("gradle customization"));
    assert!(fs::read_to_string(project.join(APPLE_YML))?.contains("DEVELOPMENT_TEAM: keep"));
    assert!(fs::read_to_string(project.join(PBXPROJ))?.contains("cargo tauri ios xcode-script"));

    platform::migrate_callbacks(project, &[platform::Target::Android, platform::Target::Ios])?;
    assert_eq!(fs::read_to_string(project.join(ANDROID_TASK))?, android);
    Ok(())
}

#[test]
fn unrecognized_mobile_callback_keeps_the_bridge_and_source() -> Result<()> {
    let root = TempDir::new()?;
    let project = root.path();
    write(project, ANDROID_TASK, GRADLE_CALLBACK)?;
    write(project, APPLE_YML, "deno task custom ios xcode-script -v\n")?;
    write(project, "deno.json", DENO_BRIDGE)?;
    assert!(
        platform::migrate_callbacks(project, &[platform::Target::Android, platform::Target::Ios])
            .is_err()
    );
    assert_eq!(
        fs::read_to_string(project.join(ANDROID_TASK))?,
        GRADLE_CALLBACK
    );
    assert!(project.join("deno.json").is_file());
    Ok(())
}

#[test]
fn project_lock_rejects_concurrent_writers_and_recovers_on_drop() -> Result<()> {
    let root = TempDir::new()?;
    let first = files::lock(root.path())?;
    assert!(files::lock(root.path()).is_err());
    drop(first);
    let _lock = files::lock(root.path())?;
    Ok(())
}

#[test]
fn frontend_failure_preserves_previous_published_output() -> Result<()> {
    let (_root, app) = fixture()?;
    write(&app.output, "spa/index.html", "previous")?;
    let result = files::prepare_frontend(
        &app,
        Some(|| {
            write(&app.dist, "index.html", "partial")?;
            bail!("frontend failed");
        }),
    );
    assert!(result.is_err());
    assert_eq!(
        fs::read_to_string(app.output.join("spa/index.html"))?,
        "previous"
    );
    assert!(!app.output.join("index.html").exists());
    Ok(())
}

#[test]
fn successful_frontend_snapshot_and_single_target_publication() -> Result<()> {
    let (_root, app) = fixture()?;
    write(&app.output, "spa/index.html", "previous")?;
    write(&app.output, "gwa-minimal-0.2.0.apk", "android")?;
    write(&app.frontend, "old.js", "obsolete")?;
    files::prepare_frontend(&app, Some(|| write(&app.dist, "index.html", "new")))?;
    let snapshot = app.frontend.join("index.html");
    assert!(!app.frontend.join("old.js").exists());
    let timestamp = fs::metadata(&snapshot)?.modified()?;
    files::prepare_frontend(&app, Some(|| write(&app.dist, "index.html", "new")))?;
    assert_eq!(fs::metadata(&snapshot)?.modified()?, timestamp);

    let binary = app.project.join("candidate");
    write(&app.project, "candidate", "executable")?;
    files::publish(&app, &[(files::Kind::Desktop, binary)])?;
    assert_eq!(
        fs::read_to_string(app.output.join("spa/index.html"))?,
        "new"
    );
    assert_eq!(
        fs::read_to_string(app.output.join(app.executable_name()))?,
        "executable"
    );
    assert_eq!(
        fs::read_to_string(app.output.join("gwa-minimal-0.2.0.apk"))?,
        "android"
    );
    Ok(())
}

#[test]
fn ipa_is_collected_from_xcode_export_directory() -> Result<()> {
    let (_root, app) = fixture()?;
    let relative = "gen/apple/build/arm64/GWA Minimal.ipa";
    write(&app.host, relative, "signed device export")?;
    let (kind, path) = platform::built_artifact(&app, platform::Target::Ios, "release")?;
    assert_eq!(kind, files::Kind::Ios);
    assert_eq!(path, app.host.join(relative));
    Ok(())
}
