use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
    time::SystemTime,
};

use anyhow::{Context, Result, ensure};
use clap::ValueEnum;
use tempfile::Builder;

use crate::{
    files::{self, Artifact, Kind},
    process,
    project::{self, App},
};

#[derive(Clone, Copy, Debug, PartialEq, Eq, ValueEnum)]
pub enum Target {
    Desktop,
    Android,
    Ios,
    Both,
    All,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, ValueEnum)]
pub enum Arch {
    Aarch64,
    Armv7,
    I686,
    #[value(name = "x86_64")]
    X86_64,
}

impl Arch {
    fn names(self) -> (&'static str, &'static str) {
        match self {
            Self::Aarch64 => ("aarch64", "aarch64-linux-android"),
            Self::Armv7 => ("armv7", "armv7-linux-androideabi"),
            Self::I686 => ("i686", "i686-linux-android"),
            Self::X86_64 => ("x86_64", "x86_64-linux-android"),
        }
    }
}

#[derive(Clone, Copy, Debug, ValueEnum)]
pub enum ExportMethod {
    Debugging,
    ReleaseTesting,
    AppStoreConnect,
}

impl Target {
    pub fn expand(self) -> Result<&'static [Target]> {
        use Target::*;
        ensure!(
            !matches!(self, Ios | All) || cfg!(target_os = "macos"),
            "iOS builds require macOS with Xcode. Use --target both for desktop and Android"
        );
        Ok(match self {
            Desktop => &[Desktop],
            Android => &[Android],
            Ios => &[Ios],
            Both => &[Desktop, Android],
            All => &[Desktop, Android, Ios],
        })
    }
}

pub fn tauri(app: &App, args: &[&str]) -> Result<()> {
    process::run(
        Command::new("cargo")
            .arg("tauri")
            .args(args)
            .current_dir(&app.project)
            .env("CARGO_TARGET_DIR", &app.cache),
    )
}

fn rust_targets(app: &App, targets: &[&str]) -> Result<()> {
    process::run(
        Command::new("rustup")
            .args(["target", "add"])
            .args(targets)
            .current_dir(&app.project),
    )
}

fn xcode_projects(apple: &Path) -> Result<Vec<PathBuf>> {
    if !apple.try_exists()? {
        return Ok(Vec::new());
    }
    let mut projects = Vec::new();
    for entry in fs::read_dir(apple)? {
        let entry = entry?;
        if entry.file_type()?.is_dir()
            && entry
                .path()
                .extension()
                .is_some_and(|ext| ext == "xcodeproj")
            && entry.path().join("project.pbxproj").is_file()
        {
            projects.push(entry.path());
        }
    }
    Ok(projects)
}

pub fn initialize(app: &App, target: Target, arch: Arch, dev: bool) -> Result<()> {
    match target {
        Target::Desktop => (),
        Target::Android => {
            let targets = if dev {
                vec![
                    Arch::Aarch64.names().1,
                    Arch::Armv7.names().1,
                    Arch::I686.names().1,
                    Arch::X86_64.names().1,
                ]
            } else {
                vec![arch.names().1]
            };
            rust_targets(app, &targets)?;
            if !app.host.join("gen/android/gradlew").is_file() {
                tauri(app, &["android", "init", "--ci", "--skip-targets-install"])?;
            }
        }
        Target::Ios => {
            let mut targets = vec!["aarch64-apple-ios"];
            if dev {
                targets.extend(["aarch64-apple-ios-sim", "x86_64-apple-ios"]);
            }
            rust_targets(app, &targets)?;
            if xcode_projects(&app.host.join("gen/apple"))?.is_empty() {
                tauri(app, &["ios", "init", "--ci", "--skip-targets-install"])?;
            }
        }
        Target::Both | Target::All => unreachable!("expand target selection first"),
    }
    Ok(())
}

pub fn prepare_icons(app: &App, targets: &[Target]) -> Result<()> {
    let source = app.icon()?;
    let mobile = targets
        .iter()
        .any(|target| matches!(target, Target::Android | Target::Ios));
    let windows_desktop = cfg!(windows) && targets.contains(&Target::Desktop);
    let full = mobile || windows_desktop;
    // Tauri discovers initialized mobile resources relative to the output directory's parent.
    let parent = if mobile { &app.host } else { &app.project };
    let temp = Builder::new().prefix(".native-icons-").tempdir_in(parent)?;
    let output = temp
        .path()
        .to_str()
        .context("Icon output path must be valid Unicode")?;
    let source = source
        .to_str()
        .context("Icon source path must be valid Unicode")?;
    let mut args = vec!["icon", source, "--output", output, "--fit", "contain"];
    if !full {
        args.extend(["--png", "512"]);
    }
    tauri(app, &args)?;

    let png = if full { "icon.png" } else { "512x512.png" };
    let mut changed = files::write_changed(
        &app.host.join("icons/icon.png"),
        &fs::read(temp.path().join(png))?,
    )?;
    if windows_desktop {
        changed |= files::write_changed(
            &app.host.join("icons/icon.ico"),
            &fs::read(temp.path().join("icon.ico"))?,
        )?;
    }
    if changed {
        // tauri-build tracks this file. Refresh it on an icon-only change even with a legacy host.
        fs::File::options()
            .write(true)
            .open(app.host.join("tauri.conf.json"))?
            .set_modified(SystemTime::now())?;
    }
    Ok(())
}

pub fn build(
    app: &App,
    target: Target,
    arch: Arch,
    release: bool,
    debug: bool,
    export: ExportMethod,
) -> Result<Artifact> {
    let mut args = match target {
        Target::Desktop => vec!["build", "--no-bundle"],
        Target::Android => vec!["android", "build", "--apk", "--target", arch.names().0],
        Target::Ios => {
            let export = match export {
                ExportMethod::Debugging => "debugging",
                ExportMethod::ReleaseTesting => "release-testing",
                ExportMethod::AppStoreConnect => "app-store-connect",
            };
            vec![
                "ios",
                "build",
                "--target",
                "aarch64",
                "--export-method",
                export,
            ]
        }
        Target::Both | Target::All => unreachable!("expand target selection first"),
    };
    let debug = if target == Target::Desktop {
        debug
    } else {
        !release
    };
    if debug {
        args.push("--debug");
    }
    args.extend(["--config", r#"{"build":{"beforeBuildCommand":null}}"#]);
    let profile = if debug { "debug" } else { "release" };
    let previous_ipa = if target == Target::Ios {
        built_artifact(app, target, profile)
            .ok()
            .map(|(_, path)| {
                let modified = fs::metadata(&path)?.modified()?;
                Ok::<_, std::io::Error>((path, modified))
            })
            .transpose()?
    } else {
        None
    };
    tauri(app, &args)?;
    let artifact = built_artifact(app, target, profile)?;
    if let Some((path, modified)) = previous_ipa
        && path == artifact.1
    {
        ensure!(
            fs::metadata(&path)?.modified()? != modified,
            "Xcode did not replace {}",
            path.display()
        );
    }
    Ok(artifact)
}

pub fn built_artifact(app: &App, target: Target, profile: &str) -> Result<Artifact> {
    Ok(match target {
        Target::Desktop => {
            let path = app.cache.join(profile).join(app.executable_name());
            ensure!(path.is_file(), "Expected executable {}", path.display());
            (Kind::Desktop, path)
        }
        Target::Android => (
            Kind::Android,
            files::one_artifact(
                &app.host
                    .join("gen/android/app/build/outputs/apk/universal")
                    .join(profile),
                "apk",
            )?,
        ),
        Target::Ios => (
            Kind::Ios,
            files::one_artifact(&app.host.join("gen/apple/build/arm64"), "ipa")?,
        ),
        Target::Both | Target::All => unreachable!("expand target selection first"),
    })
}

pub fn dev(app: &App, target: Target) -> Result<()> {
    let args: &[&str] = match target {
        Target::Desktop => &["dev"],
        Target::Android => &["android", "dev"],
        Target::Ios => &["ios", "dev"],
        Target::Both | Target::All => unreachable!("expand target selection first"),
    };
    tauri(app, args)
}

pub fn frontend(app: &App, build: bool) -> Result<()> {
    let mode = if build { "build" } else { "dev" };
    let mut command = Command::new("deno");
    if app.has_task(mode) {
        command.arg("task");
    } else {
        command.args(["run", "-A"]);
    }
    command.arg("--config").arg(app.directory.join("deno.json"));
    if !app.has_task(mode) {
        command.arg("npm:vite");
    }
    command.arg(mode);
    if !build {
        command
            .args(["--port", &app.port().to_string(), "--strictPort", "--host"])
            .arg(
                env::var_os("TAURI_DEV_HOST")
                    .filter(|host| !host.is_empty())
                    .unwrap_or_else(|| "127.0.0.1".into()),
            );
    }
    process::run(command.current_dir(&app.directory))
}

pub fn migrate_callbacks(project: &Path, targets: &[Target]) -> Result<()> {
    let android_selected = targets.contains(&Target::Android);
    let ios_selected = targets.contains(&Target::Ios);
    if !android_selected && !ios_selected {
        return Ok(());
    }

    let generated = project.join("src-tauri/gen");
    let android = generated.join("android");
    let task = android.join("buildSrc/src/main/kotlin/BuildTask.kt");
    let mut updates = Vec::new();
    let mut legacy_pending = false;
    if task.is_file() {
        let source =
            fs::read_to_string(&task).with_context(|| format!("Reading {}", task.display()))?;
        let executable = r#"val executable = """deno""""#;
        let args = r#"listOf("task", "tauri", "android", "android-studio-script")"#;
        if source.contains(args)
            || source
                .lines()
                .any(|line| line.contains("val executable") && line.contains("deno"))
        {
            if android_selected {
                ensure!(
                    source.contains(executable) && source.contains(args),
                    "Custom Deno callback in {}. Migrate it to cargo tauri",
                    task.display()
                );
                let replacement = source
                    .replace(executable, r#"val executable = """cargo""""#)
                    .replace(
                        args,
                        r#"listOf("tauri", "android", "android-studio-script")"#,
                    );
                updates.push((task, replacement));
            } else {
                legacy_pending = true;
            }
        }
    } else if android.join("gradlew").is_file() {
        ensure!(
            !android_selected,
            "Generated Android project is missing {}",
            task.display()
        );
        legacy_pending = true;
    }

    let apple = generated.join("apple");
    let mut apple_files: Vec<_> = xcode_projects(&apple)?
        .iter()
        .map(|path| path.join("project.pbxproj"))
        .collect();
    if apple.join("project.yml").is_file() {
        apple_files.push(apple.join("project.yml"));
    }
    for path in apple_files {
        let source =
            fs::read_to_string(&path).with_context(|| format!("Reading {}", path.display()))?;
        if !source
            .lines()
            .any(|line| line.contains("deno") && line.contains("xcode-script"))
        {
            continue;
        }
        if !ios_selected {
            legacy_pending = true;
            continue;
        }
        let replacement = source.replace(
            "deno task tauri ios xcode-script",
            "cargo tauri ios xcode-script",
        );
        ensure!(
            !replacement
                .lines()
                .any(|line| line.contains("deno") && line.contains("xcode-script")),
            "Custom Deno callback in {}. Migrate it to cargo tauri from gen/apple",
            path.display()
        );
        updates.push((path, replacement));
    }
    for (path, replacement) in updates {
        files::write_changed(&path, replacement.as_bytes())?;
        eprintln!("Migrated Tauri callback in {}", path.display());
    }

    let path = project.join("deno.json");
    if !legacy_pending
        && path.is_file()
        && let Ok(bridge) = project::read_json::<serde_json::Value>(&path)
        && let Some(object) = bridge.as_object()
        && object
            .keys()
            .all(|key| matches!(key.as_str(), "workspace" | "nodeModulesDir" | "tasks"))
        && bridge["workspace"].as_array().is_some_and(Vec::is_empty)
        && bridge["tasks"]
            .as_object()
            .is_some_and(|tasks| tasks.len() == 1)
        && bridge["tasks"]["tauri"].as_str() == Some("deno run -A npm:@tauri-apps/cli@2.12.1")
    {
        fs::remove_file(path)?;
    }
    Ok(())
}
