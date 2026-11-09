use std::{
    env, fmt,
    process::{Command, ExitStatus},
    sync::atomic::{AtomicBool, Ordering},
    thread,
    time::Duration,
};

use anyhow::{Context, Result, ensure};

pub const TAURI_VERSION: &str = "2.12.1";
static INTERRUPTED: AtomicBool = AtomicBool::new(false);

#[derive(Debug)]
pub struct ProcessError {
    pub code: i32,
    command: String,
}

impl fmt::Display for ProcessError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Command failed ({}): {}", self.code, self.command)
    }
}

impl std::error::Error for ProcessError {}

pub fn install_interrupt_handler() -> Result<()> {
    ctrlc::set_handler(|| INTERRUPTED.store(true, Ordering::Relaxed))
        .context("Installing Ctrl+C handler")
}

fn check_interrupt(command: &str) -> Result<()> {
    if INTERRUPTED.load(Ordering::Relaxed) {
        return Err(ProcessError {
            code: 130,
            command: command.into(),
        }
        .into());
    }
    Ok(())
}

pub fn run(command: &mut Command) -> Result<()> {
    let display = format!("{command:?}");
    check_interrupt(&display)?;
    eprintln!("> {display}");
    let mut child = command
        .spawn()
        .with_context(|| format!("Starting {display}"))?;
    let status = loop {
        if INTERRUPTED.load(Ordering::Relaxed) {
            let _ = child.kill();
            let _ = child.wait();
            check_interrupt(&display)?;
        }
        if let Some(status) = child.try_wait()? {
            break status;
        }
        thread::sleep(Duration::from_millis(35));
    };
    check_interrupt(&display)?;
    check_status(status, display)
}

fn check_status(status: ExitStatus, command: String) -> Result<()> {
    if status.success() {
        return Ok(());
    }
    Err(ProcessError {
        code: status.code().unwrap_or(1),
        command,
    }
    .into())
}

pub fn verify_tauri(project: &std::path::Path) -> Result<()> {
    let output = Command::new("cargo")
        .args(["tauri", "--version"])
        .current_dir(project)
        .output()
        .context("Running cargo tauri --version")?;
    let required = semver::VersionReq::parse(&format!(">={TAURI_VERSION}"))?;
    let installed = String::from_utf8_lossy(&output.stdout)
        .split_whitespace()
        .last()
        .and_then(|v| semver::Version::parse(v).ok());
    ensure!(
        output.status.success() && installed.is_some_and(|v| required.matches(&v)),
        "Tauri CLI >= {TAURI_VERSION} is required (enter nix develop .#android or .#desktop)"
    );
    Ok(())
}

pub fn color() -> bool {
    use std::io::{IsTerminal, stdout};
    stdout().is_terminal() && env::var_os("NO_COLOR").is_none()
}
