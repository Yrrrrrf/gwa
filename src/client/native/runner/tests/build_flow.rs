#![cfg(unix)]

use std::{
    env, fs,
    os::unix::fs::PermissionsExt,
    path::Path,
    process::{Command, Output},
};

use anyhow::Result;
use tempfile::TempDir;

struct Fixture {
    _tmp: TempDir,
    root: std::path::PathBuf,
    tools: std::path::PathBuf,
    cache: std::path::PathBuf,
}

impl Fixture {
    fn new() -> Result<Self> {
        let tmp = TempDir::new()?;
        let root = tmp.path().join("client");
        let tools = tmp.path().join("bin");
        let cache = tmp.path().join("cache");
        fs::create_dir_all(root.join("apps/minimal"))?;
        fs::create_dir_all(root.join("native/host/src"))?;
        fs::create_dir_all(&tools)?;
        fs::create_dir_all(&cache)?;
        let host = Path::new(env!("CARGO_MANIFEST_DIR")).join("../host");
        for path in [
            "Cargo.toml",
            "Cargo.lock",
            "build.rs",
            "src/main.rs",
            "src/lib.rs",
            "tauri.conf.json",
        ] {
            fs::copy(host.join(path), root.join("native/host").join(path))?;
        }
        fs::write(
            root.join("apps/minimal/deno.json"),
            r#"{"version":"0.0.1"}"#,
        )?;
        fs::write(root.join("apps/minimal/icon.svg"), "<svg/>")?;
        let fixture = Self {
            _tmp: tmp,
            root,
            tools,
            cache,
        };
        fixture.tool("rustup", "#!/bin/sh\nexit 0\n")?;
        fixture.tool(
            "deno",
            r#"#!/bin/sh
set -eu
echo frontend >> "$GWA_TEST_TRACE"
mkdir -p build
printf '<p>from frontend</p>' > build/index.html
"#,
        )?;
        fixture.tool(
            "cargo",
            r#"#!/bin/sh
set -eu
printf '%s\n' "$*" >> "$GWA_TEST_TRACE"
case "$*" in
  "tauri --version") echo 'tauri-cli 2.12.1';;
  "tauri android init "*)
    mkdir -p src-tauri/gen/android/buildSrc/src/main/kotlin
    : > src-tauri/gen/android/gradlew
    : > src-tauri/gen/android/buildSrc/src/main/kotlin/BuildTask.kt;;
  "tauri icon "*)
    while [ "$1" != "--output" ]; do shift; done
    mkdir -p "$2"
    printf brand > "$2/icon.png"
    printf brand > "$2/512x512.png";;
  "tauri build "*)
    mkdir -p "$CARGO_TARGET_DIR/release"
    printf binary > "$CARGO_TARGET_DIR/release/gwa-minimal"
    chmod +x "$CARGO_TARGET_DIR/release/gwa-minimal";;
  "tauri android build "*)
    [ "${GWA_TEST_FAIL_ANDROID:-0}" != 1 ] || exit 37
    [ "$(cat src-tauri/icons/icon.png)" = brand ]
    mkdir -p src-tauri/gen/android/app/build/outputs/apk/universal/debug
    printf apk > src-tauri/gen/android/app/build/outputs/apk/universal/debug/example.apk;;
  "fmt "*) :;;
  *) exit 90;;
esac
"#,
        )?;
        fixture.tool(
            "just",
            r#"#!/bin/sh
set -eu
echo cycle >> "$GWA_TEST_TRACE"
mkdir -p apps/minimal/build
printf '<p>from cycle</p>' > apps/minimal/build/index.html
"#,
        )?;
        Ok(fixture)
    }

    fn tool(&self, name: &str, contents: &str) -> Result<()> {
        let path = self.tools.join(name);
        fs::write(&path, contents)?;
        fs::set_permissions(path, fs::Permissions::from_mode(0o755))?;
        Ok(())
    }

    fn run(&self, action: &str, fail_android: bool) -> Result<Output> {
        let original = env::var_os("PATH").unwrap_or_default();
        let path = env::join_paths(
            std::iter::once(self.tools.clone()).chain(env::split_paths(&original)),
        )?;
        Ok(Command::new(env!("CARGO_BIN_EXE_gwa-native-runner"))
            .args([action, "minimal", "--target", "both"])
            .current_dir(&self.root)
            .env("PATH", path)
            .env("GWA_NATIVE_CACHE_DIR", &self.cache)
            .env("GWA_TEST_TRACE", self.root.join("trace.log"))
            .env(
                "GWA_TEST_FAIL_ANDROID",
                if fail_android { "1" } else { "0" },
            )
            .output()?)
    }
}

#[test]
fn one_frontend_and_icon_generation_feed_both_targets() -> Result<()> {
    let fixture = Fixture::new()?;
    let result = fixture.run("build", false)?;
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let trace = fs::read_to_string(fixture.root.join("trace.log"))?;
    assert_eq!(trace.lines().filter(|line| *line == "frontend").count(), 1);
    assert_eq!(trace.matches("tauri icon ").count(), 1);
    assert!(trace.find("tauri android init").unwrap() < trace.find("tauri icon").unwrap());
    assert!(trace.find("tauri icon").unwrap() < trace.find("tauri android build").unwrap());
    let output = fixture.root.join("apps/minimal/build");
    assert!(output.join("spa/index.html").is_file());
    assert_ne!(
        fs::metadata(output.join("gwa-minimal"))?
            .permissions()
            .mode()
            & 0o111,
        0
    );
    assert_eq!(fs::read_to_string(output.join("gwa-minimal"))?, "binary");
    assert_eq!(
        fs::read_to_string(output.join("gwa-minimal-0.0.1.apk"))?,
        "apk"
    );
    Ok(())
}

#[test]
fn failed_second_target_keeps_old_release_and_child_status() -> Result<()> {
    let fixture = Fixture::new()?;
    let output = fixture.root.join("apps/minimal/build");
    fs::create_dir_all(output.join("spa"))?;
    fs::write(output.join("spa/index.html"), "previous spa")?;
    fs::write(output.join("gwa-minimal"), "previous desktop")?;
    fs::write(output.join("gwa-minimal-0.0.1.apk"), "previous apk")?;
    let result = fixture.run("build", true)?;
    assert_eq!(
        result.status.code(),
        Some(37),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    assert_eq!(
        fs::read_to_string(output.join("spa/index.html"))?,
        "previous spa"
    );
    assert_eq!(
        fs::read_to_string(output.join("gwa-minimal"))?,
        "previous desktop"
    );
    assert_eq!(
        fs::read_to_string(output.join("gwa-minimal-0.0.1.apk"))?,
        "previous apk"
    );
    Ok(())
}

#[test]
fn cycle_uses_the_existing_web_pipeline_output() -> Result<()> {
    let fixture = Fixture::new()?;
    let result = fixture.run("cycle", false)?;
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let trace = fs::read_to_string(fixture.root.join("trace.log"))?;
    assert_eq!(trace.lines().filter(|line| *line == "cycle").count(), 1);
    assert!(!trace.lines().any(|line| line == "frontend"));
    assert_eq!(
        fs::read_to_string(fixture.root.join("apps/minimal/build/spa/index.html"))?,
        "<p>from cycle</p>"
    );
    Ok(())
}
