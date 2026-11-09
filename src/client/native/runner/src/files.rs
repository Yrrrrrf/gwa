use std::{
    collections::BTreeSet,
    fs::{self, File, OpenOptions, TryLockError},
    io::{self, Write},
    path::{Path, PathBuf},
};

use anyhow::{Context, Result, bail, ensure};
use tempfile::{Builder, NamedTempFile};

use crate::project::App;

pub fn write_changed(path: &Path, contents: &[u8]) -> Result<bool> {
    match fs::read(path) {
        Ok(existing) if existing == contents => return Ok(false),
        Ok(_) => (),
        Err(error) if error.kind() == io::ErrorKind::NotFound => (),
        Err(error) => return Err(error).with_context(|| format!("Reading {}", path.display())),
    }
    let parent = path.parent().context("Output path has no parent")?;
    fs::create_dir_all(parent)?;
    let mut temporary = NamedTempFile::new_in(parent)?;
    if let Ok(meta) = fs::metadata(path) {
        temporary.as_file().set_permissions(meta.permissions())?;
    }
    temporary.write_all(contents)?;
    temporary
        .persist(path)
        .with_context(|| format!("Writing {}", path.display()))?;
    Ok(true)
}

pub fn lock(project: &Path) -> Result<File> {
    fs::create_dir_all(project)?;
    let lock = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(project.join(".runner-lock"))?;
    match lock.try_lock() {
        Ok(()) => Ok(lock),
        Err(TryLockError::WouldBlock) => bail!(
            "A native operation is already running for {}",
            project.display()
        ),
        Err(TryLockError::Error(error)) => Err(error).context("Locking the native project"),
    }
}

fn remove(path: &Path) -> Result<()> {
    let meta = match fs::symlink_metadata(path) {
        Ok(meta) => meta,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error.into()),
    };
    if meta.is_dir() {
        fs::remove_dir_all(path)?;
    } else {
        fs::remove_file(path)?;
    }
    Ok(())
}

fn copy_tree(from: &Path, to: &Path, sync: bool) -> Result<()> {
    if sync && to.try_exists()? && !fs::symlink_metadata(to)?.is_dir() {
        remove(to)?;
    }
    fs::create_dir_all(to)?;
    let mut names = BTreeSet::new();
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let kind = entry.file_type()?;
        let source = entry.path();
        let name = entry.file_name();
        let destination = to.join(&name);
        names.insert(name);
        if kind.is_dir() {
            copy_tree(&source, &destination, sync)?;
        } else if kind.is_file() {
            if sync {
                if let Ok(meta) = fs::symlink_metadata(&destination)
                    && !meta.is_file()
                {
                    remove(&destination)?;
                }
                write_changed(&destination, &fs::read(&source)?)?;
            } else {
                fs::copy(source, destination)?;
            }
        } else {
            bail!(
                "Static output contains an unsupported entry: {}",
                source.display()
            );
        }
    }
    if sync {
        for entry in fs::read_dir(to)? {
            let entry = entry?;
            if !names.contains(&entry.file_name()) {
                remove(&entry.path())?;
            }
        }
    }
    Ok(())
}

fn snapshot(app: &App) -> Result<()> {
    app.verify_dist()?;
    copy_tree(&app.dist, &app.frontend, true)
}

pub fn prepare_frontend(app: &App, build: Option<impl FnOnce() -> Result<()>>) -> Result<()> {
    let Some(build) = build else {
        return snapshot(app);
    };
    if app.dist != app.output {
        build()?;
        return snapshot(app);
    }

    // The frontend writes into the publication directory. Back it up on the same filesystem.
    let temp = Builder::new()
        .prefix(".native-frontend-")
        .tempdir_in(&app.directory)?;
    let previous = temp.path().join("previous");
    let had_previous = app.output.try_exists()?;
    if had_previous {
        fs::rename(&app.output, &previous)?;
    }
    let result = build().and_then(|()| snapshot(app));
    let restore = remove(&app.output).and_then(|()| {
        if had_previous {
            fs::rename(&previous, &app.output)?;
        }
        Ok(())
    });
    if let Err(error) = restore {
        let recovery = temp.keep();
        return Err(error).with_context(|| {
            format!(
                "Restoring previous output; recovery directory: {}",
                recovery.display()
            )
        });
    }
    result
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Kind {
    Spa,
    Desktop,
    Android,
    Ios,
}

impl Kind {
    pub fn label(self) -> &'static str {
        match self {
            Self::Spa => "SPA",
            Self::Desktop => "Desktop",
            Self::Android => "Android",
            Self::Ios => "iOS",
        }
    }

    pub fn filename(self, app: &App) -> String {
        match self {
            Self::Spa => "spa".into(),
            Self::Desktop => app.executable_name(),
            Self::Android => format!("{}-{}.apk", app.package(), app.version()),
            Self::Ios => format!("{}-{}.ipa", app.package(), app.version()),
        }
    }
}

pub type Artifact = (Kind, PathBuf);

pub fn published(app: &App) -> Result<Vec<Artifact>> {
    if !app.output.try_exists()? {
        return Ok(Vec::new());
    }
    let mut files = Vec::new();
    if app.output.join("spa/index.html").is_file() {
        files.push((Kind::Spa, app.output.join("spa")));
    }
    let mut entries = fs::read_dir(&app.output)?.collect::<io::Result<Vec<_>>>()?;
    entries.sort_by_key(fs::DirEntry::file_name);
    let prefix = format!("{}-", app.package());
    for entry in entries {
        if !entry.file_type()?.is_file() {
            continue;
        }
        let name = entry.file_name();
        let name = name.to_string_lossy();
        let kind = if name == app.executable_name() {
            Kind::Desktop
        } else if name.starts_with(&prefix) && name.ends_with(".apk") {
            Kind::Android
        } else if name.starts_with(&prefix) && name.ends_with(".ipa") {
            Kind::Ios
        } else {
            continue;
        };
        files.push((kind, entry.path()));
    }
    Ok(files)
}

pub fn publish(app: &App, built: &[Artifact]) -> Result<Vec<Artifact>> {
    let temp = Builder::new()
        .prefix(".native-build-")
        .tempdir_in(&app.directory)?;
    let stage = temp.path().join("next");
    let previous = temp.path().join("previous");
    copy_tree(&app.frontend, &stage.join("spa"), false)?;
    for (kind, path) in published(app)? {
        if kind != Kind::Spa && !built.iter().any(|(new, _)| *new == kind) {
            fs::copy(
                &path,
                stage.join(path.file_name().context("Artifact filename missing")?),
            )?;
        }
    }
    for (kind, path) in built {
        fs::copy(path, stage.join(kind.filename(app)))?;
    }

    let had_previous = app.output.try_exists()?;
    if had_previous {
        fs::rename(&app.output, &previous)?;
    }
    if let Err(error) = fs::rename(&stage, &app.output) {
        if had_previous && let Err(restore) = fs::rename(&previous, &app.output) {
            let recovery = temp.keep();
            bail!(
                "Publication failed ({error}) and restore failed ({restore}); previous output at {}",
                recovery.join("previous").display()
            );
        }
        return Err(error).context("Publishing native artifacts");
    }
    published(app)
}

pub fn one_artifact(directory: &Path, extension: &str) -> Result<PathBuf> {
    fn scan(dir: &Path, extension: &str, files: &mut Vec<PathBuf>) -> io::Result<()> {
        if !dir.try_exists()? {
            return Ok(());
        }
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let kind = entry.file_type()?;
            if kind.is_dir() {
                scan(&entry.path(), extension, files)?;
            } else if kind.is_file() && entry.path().extension().is_some_and(|ext| ext == extension)
            {
                files.push(entry.path());
            }
        }
        Ok(())
    }

    let mut files = Vec::new();
    scan(directory, extension, &mut files)?;
    ensure!(
        files.len() == 1,
        "Expected one .{extension} in {}, found {}",
        directory.display(),
        files.len()
    );
    Ok(files.remove(0))
}
