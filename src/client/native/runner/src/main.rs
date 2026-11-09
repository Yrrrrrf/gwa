mod files;
mod platform;
mod process;
mod project;

use std::process::Command;

use anyhow::{Result, ensure};
use clap::{Parser, Subcommand, ValueEnum};
use platform::{Arch, ExportMethod, Target};
use project::App;

#[derive(Debug, Parser)]
#[command(
    name = "gwa-native",
    version,
    about = "Build and run the GWA Tauri host"
)]
struct Cli {
    #[command(subcommand)]
    command: Action,
}

#[derive(Debug, Subcommand)]
enum Action {
    /// List apps enabled for native builds.
    List,
    /// Prepare the generated project and platform icons.
    Init(Launch),
    /// Build the frontend and publish selected native artifacts.
    Build(Build),
    /// Launch a development build.
    Dev(Launch),
    /// Run the existing web cycle and then the native build.
    Cycle(Build),
    /// Check Rust formatting in the runner and host.
    Fmt,
    /// Print Tauri's environment information.
    Info(AppArgs),
    /// Show published artifacts.
    Paths { app: String },
    #[command(hide = true)]
    Frontend {
        app: String,
        #[arg(long, value_enum)]
        mode: FrontendMode,
    },
}

#[derive(Debug, Clone, clap::Args)]
struct AppArgs {
    app: String,
    #[arg(long)]
    dry_run: bool,
}

#[derive(Debug, clap::Args)]
struct Launch {
    #[command(flatten)]
    app: AppArgs,
    #[arg(long, value_enum, default_value = "android")]
    target: Target,
    #[arg(long, value_enum)]
    arch: Option<Arch>,
}

#[derive(Debug, clap::Args)]
struct Build {
    #[command(flatten)]
    app: AppArgs,
    #[arg(long, value_enum)]
    target: Option<Target>,
    #[arg(long, value_enum)]
    arch: Option<Arch>,
    #[arg(long, conflicts_with = "debug")]
    release: bool,
    #[arg(long)]
    debug: bool,
    #[arg(long, value_enum)]
    export_method: Option<ExportMethod>,
}

#[derive(Debug, Clone, Copy, ValueEnum)]
enum FrontendMode {
    Build,
    Dev,
}

fn summary(app: &App, heading: &str, artifacts: &[files::Artifact]) {
    let (green, yellow, cyan, reset) = if process::color() {
        ("\x1b[32m", "\x1b[33m", "\x1b[36m", "\x1b[0m")
    } else {
        ("", "", "", "")
    };
    println!("{green}{heading}{reset} for {} {}", app.slug, app.version());
    for (kind, path) in artifacts {
        println!(
            "  {yellow}{:<8}{reset} {cyan}{}{reset}",
            kind.label(),
            path.display()
        );
    }
}

fn dry_run(action: &str, app: &App, targets: &[Target]) -> Result<()> {
    println!(
        "{}",
        serde_json::to_string_pretty(&serde_json::json!({
            "action": action,
            "targets": targets.iter().map(|target| target.to_possible_value().unwrap().get_name().to_owned()).collect::<Vec<_>>(),
            "app": app.slug,
            "project": app.project,
            "outputDirectory": app.output,
            "cargoTargetDirectory": app.cache,
            "config": app.config()?,
        }))?
    );
    Ok(())
}

fn format(root: &std::path::Path) -> Result<()> {
    for path in ["native/runner/Cargo.toml", "native/host/Cargo.toml"] {
        process::run(
            Command::new("cargo")
                .args(["fmt", "--manifest-path"])
                .arg(root.join(path))
                .args(["--all", "--", "--check"])
                .current_dir(root),
        )?;
    }
    Ok(())
}

fn arch_for(target: Target, arch: Option<Arch>) -> Result<Arch> {
    ensure!(
        target != Target::Desktop || arch.is_none(),
        "--arch applies to Android"
    );
    ensure!(
        target != Target::Ios || arch.is_none_or(|arch| arch == Arch::Aarch64),
        "iOS builds use aarch64"
    );
    Ok(arch.unwrap_or(Arch::Aarch64))
}

fn launch(app: App, args: Launch, dev: bool) -> Result<()> {
    ensure!(
        !matches!(args.target, Target::Both | Target::All),
        "Select desktop, android, or ios for init/dev"
    );
    let arch = arch_for(args.target, args.arch)?;
    let targets = args.target.expand()?;
    if args.app.dry_run {
        return dry_run(if dev { "dev" } else { "init" }, &app, targets);
    }
    process::verify_tauri(&app.root)?;
    let _lock = files::lock(&app.project)?;
    app.materialize()?;
    app.prepare_cache()?;
    platform::migrate_callbacks(&app.project, targets)?;
    platform::initialize(&app, args.target, arch, dev)?;
    platform::prepare_icons(&app, targets)?;
    if dev {
        platform::dev(&app, args.target)
    } else {
        println!("Native project ready: {}", app.project.display());
        Ok(())
    }
}

fn build(app: App, args: Build, cycle: bool) -> Result<()> {
    let target = args.target.unwrap_or(if cfg!(target_os = "macos") {
        Target::All
    } else {
        Target::Both
    });
    let arch = arch_for(target, args.arch)?;
    let targets = target.expand()?;
    ensure!(
        args.export_method.is_none() || targets.contains(&Target::Ios),
        "--export-method requires an iOS build"
    );
    if args.app.dry_run {
        return dry_run(if cycle { "cycle" } else { "build" }, &app, targets);
    }
    process::verify_tauri(&app.root)?;
    let _lock = files::lock(&app.project)?;
    app.prepare_cache()?;
    if cycle {
        process::run(
            Command::new("just")
                .args(["--justfile"])
                .arg(app.root.join("justfile"))
                .arg("cycle")
                .current_dir(&app.root),
        )?;
        format(&app.root)?;
    }
    app.materialize()?;
    let frontend = || platform::frontend(&app, true);
    files::prepare_frontend(&app, (!cycle).then_some(frontend))?;
    platform::migrate_callbacks(&app.project, targets)?;
    for &target in targets {
        platform::initialize(&app, target, arch, false)?;
    }
    platform::prepare_icons(&app, targets)?;
    let mut outputs = Vec::new();
    for &target in targets {
        outputs.push(platform::build(
            &app,
            target,
            arch,
            args.release,
            args.debug,
            args.export_method.unwrap_or(ExportMethod::Debugging),
        )?);
    }
    summary(&app, "Build complete", &files::publish(&app, &outputs)?);
    Ok(())
}

fn run(action: Action) -> Result<()> {
    let root = project::root()?;
    match action {
        Action::List => {
            for (name, (_, entry)) in project::registry(&root)? {
                println!(
                    "{name}\t{}\t{}",
                    entry.identifier,
                    entry.frontend_dist.display()
                );
            }
        }
        Action::Fmt => format(&root)?,
        Action::Init(args) => launch(App::open(root, args.app.app.clone())?, args, false)?,
        Action::Dev(args) => launch(App::open(root, args.app.app.clone())?, args, true)?,
        Action::Build(args) => build(App::open(root, args.app.app.clone())?, args, false)?,
        Action::Cycle(args) => build(App::open(root, args.app.app.clone())?, args, true)?,
        Action::Info(args) => {
            let app = App::open(root, args.app)?;
            if args.dry_run {
                return dry_run("info", &app, &[]);
            }
            process::verify_tauri(&app.root)?;
            let _lock = files::lock(&app.project)?;
            app.materialize()?;
            platform::tauri(&app, &["info"])?;
        }
        Action::Paths { app } => {
            let app = App::open(root, app)?;
            let artifacts = files::published(&app)?;
            ensure!(
                !artifacts.is_empty(),
                "No published artifacts. Run build {} first",
                app.slug
            );
            summary(&app, "Build artifacts", &artifacts);
        }
        Action::Frontend { app, mode } => {
            let app = App::open(root, app)?;
            // Native dev keeps the lock while Tauri calls this frontend hook.
            if matches!(mode, FrontendMode::Build) {
                let _lock = files::lock(&app.project)?;
                files::prepare_frontend(&app, Some(|| platform::frontend(&app, true)))?;
            } else {
                platform::frontend(&app, false)?;
            }
        }
    }
    Ok(())
}

fn main() {
    let cli = Cli::parse();
    let result = process::install_interrupt_handler().and_then(|()| run(cli.command));
    if let Err(error) = result {
        eprintln!("{error:#}");
        let status = error
            .downcast_ref::<process::ProcessError>()
            .map_or(1, |error| error.code);
        std::process::exit(status);
    }
}

#[cfg(test)]
mod tests;
