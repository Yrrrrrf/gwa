use std::{
    collections::{BTreeMap, BTreeSet},
    env, fs,
    path::{Component, Path, PathBuf},
};

use anyhow::{Context, Result, bail, ensure};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use toml_edit::{Array, DocumentMut, value};

use crate::files::write_changed;

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RawEntry {
    identifier: Option<String>,
    frontend_dist: Option<PathBuf>,
    product_name: Option<String>,
    slug: Option<String>,
    icon: Option<PathBuf>,
    port: Option<u16>,
    tauri: Option<Value>,
}

#[derive(Debug, Clone)]
pub struct Entry {
    pub identifier: String,
    pub frontend_dist: PathBuf,
    pub product_name: Option<String>,
    pub icon: Option<PathBuf>,
    pub port: Option<u16>,
    pub tauri: Option<Value>,
}

#[derive(Debug, Deserialize)]
struct Metadata {
    version: semver::Version,
    #[serde(default)]
    authors: Vec<String>,
    license: Option<String>,
    #[serde(default)]
    tasks: BTreeMap<String, Value>,
    #[serde(default)]
    native: Option<RawEntry>,
}

#[derive(Serialize, Deserialize, PartialEq, Debug)]
#[serde(rename_all = "camelCase")]
struct Identity {
    identifier: String,
    product_name: String,
}

#[derive(Debug)]
pub struct App {
    pub root: PathBuf,
    pub slug: String,
    pub entry: Entry,
    pub directory: PathBuf,
    pub dist: PathBuf,
    pub output: PathBuf,
    pub project: PathBuf,
    pub host: PathBuf,
    pub frontend: PathBuf,
    pub cache: PathBuf,
    metadata: Metadata,
}

pub fn read_json<T: DeserializeOwned>(path: &Path) -> Result<T> {
    let data = fs::read(path).with_context(|| format!("Reading {}", path.display()))?;
    serde_json::from_slice(&data).with_context(|| format!("Parsing {}", path.display()))
}

pub fn root() -> Result<PathBuf> {
    let cwd = env::current_dir()?;
    let candidate = cwd
        .ancestors()
        .find(|path| path.join("apps").is_dir() && path.join("native/host").is_dir())
        .map(Path::to_path_buf)
        .unwrap_or_else(|| Path::new(env!("CARGO_MANIFEST_DIR")).join("../.."));
    dunce::canonicalize(candidate).context("Locating the client root")
}

fn valid_slug(slug: &str) -> bool {
    slug.as_bytes().first().is_some_and(u8::is_ascii_lowercase)
        && slug.split('-').all(|part| {
            !part.is_empty()
                && part
                    .bytes()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
        })
}

fn valid_identifier(identifier: &str) -> bool {
    identifier.split('.').count() >= 2
        && identifier.split('.').all(|part| {
            !part.is_empty()
                && part
                    .bytes()
                    .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'_')
        })
}

fn relative_to(base: &Path, value: &Path, label: &str) -> Result<PathBuf> {
    ensure!(
        value
            .components()
            .any(|part| matches!(part, Component::Normal(_)))
            && value
                .components()
                .all(|part| matches!(part, Component::Normal(_) | Component::CurDir)),
        "{label} must stay inside {}: {}",
        base.display(),
        value.display()
    );
    Ok(base.join(value))
}

fn default_product_name(slug: &str) -> String {
    let mut title = String::from("GWA");
    for part in slug.split('-') {
        let mut chars = part.chars();
        if let Some(first) = chars.next() {
            title.push(' ');
            title.extend(first.to_uppercase());
            title.push_str(chars.as_str());
        }
    }
    title
}

pub fn registry(root: &Path) -> Result<BTreeMap<String, (PathBuf, Entry)>> {
    let apps = root.join("apps");
    let real_apps = dunce::canonicalize(&apps)?;
    let mut entries = BTreeMap::new();
    let mut identifiers = BTreeSet::new();
    for folder in fs::read_dir(&apps)? {
        let folder = folder?;
        let Some(name) = folder.file_name().into_string().ok() else {
            continue;
        };
        let path = folder.path();
        let manifest = path.join("deno.json");
        if !path.is_dir() || !manifest.is_file() {
            continue;
        }
        let metadata: Metadata = read_json(&manifest)?;
        let raw = metadata.native.unwrap_or_default();
        let slug = raw.slug.unwrap_or_else(|| name.clone());
        ensure!(valid_slug(&slug), "Invalid native app name {slug}");
        ensure!(
            raw.product_name
                .as_ref()
                .is_none_or(|name| !name.trim().is_empty()),
            "{slug}.productName must be a nonempty string"
        );
        let entry = Entry {
            identifier: raw
                .identifier
                .unwrap_or_else(|| format!("dev.yrrrrrf.gwa.{}", slug.replace('-', "_"))),
            frontend_dist: raw.frontend_dist.unwrap_or_else(|| "build".into()),
            product_name: Some(
                raw.product_name
                    .unwrap_or_else(|| default_product_name(&slug)),
            ),
            icon: raw.icon,
            port: raw.port,
            tauri: raw.tauri,
        };
        ensure!(
            valid_identifier(&entry.identifier),
            "{slug}.identifier must be a lowercase reverse-domain identifier"
        );
        ensure!(
            identifiers.insert(entry.identifier.clone()),
            "Duplicate native identifier: {}",
            entry.identifier
        );
        ensure!(
            entry.port.is_none_or(|port| (1024..=65534).contains(&port)),
            "{slug}.port must be between 1024 and 65534"
        );
        if let Some(overrides) = &entry.tauri {
            let overrides = overrides
                .as_object()
                .context("tauri overrides must be an object")?;
            for (key, value) in overrides {
                ensure!(
                    matches!(key.as_str(), "app" | "bundle" | "plugins") && value.is_object(),
                    "Unsupported native override {slug}.tauri.{key}"
                );
            }
            ensure!(
                overrides
                    .get("bundle")
                    .and_then(|bundle| bundle.get("icon"))
                    .is_none(),
                "Set the icon in {slug} deno.json native.icon instead of tauri.bundle.icon"
            );
        }
        let directory = dunce::canonicalize(&path)?;
        ensure!(
            directory != real_apps && directory.starts_with(&real_apps),
            "App directory escapes {}",
            apps.display()
        );
        ensure!(
            entries.insert(slug.clone(), (directory, entry)).is_none(),
            "Duplicate native app name: {slug}"
        );
    }
    Ok(entries)
}

fn resolve_existing_parent(path: &Path) -> Result<PathBuf> {
    let existing = path
        .ancestors()
        .find(|candidate| candidate.exists())
        .context("No existing parent for Cargo cache")?;
    Ok(dunce::canonicalize(existing)?.join(path.strip_prefix(existing)?))
}

fn cache_directory(root: &Path, slug: &str) -> Result<PathBuf> {
    let base = env::var_os("GWA_NATIVE_CACHE_DIR")
        .or_else(|| env::var_os("XDG_CACHE_HOME"))
        .or_else(|| cfg!(windows).then(|| env::var_os("LOCALAPPDATA")).flatten())
        .map(PathBuf::from)
        .or_else(|| {
            env::var_os("HOME")
                .or_else(|| env::var_os("USERPROFILE"))
                .map(|home| PathBuf::from(home).join(".cache"))
        })
        .context("Set GWA_NATIVE_CACHE_DIR to a directory outside the client tree")?;
    let base = resolve_existing_parent(&std::path::absolute(base)?)?;
    ensure!(
        !base.starts_with(root) && !base.components().any(|part| part == Component::ParentDir),
        "GWA_NATIVE_CACHE_DIR must stay outside the client tree"
    );
    let root_name = root
        .to_str()
        .context("The client root must be valid Unicode")?;
    let key = format!("{:x}", Sha256::digest(root_name.as_bytes()));
    let cache = base
        .join("gwa-native")
        .join(&key[..20])
        .join(slug)
        .join("target");
    ensure!(
        !resolve_existing_parent(&cache)?.starts_with(root),
        "Native Cargo cache resolves inside the client tree"
    );
    Ok(cache)
}

impl App {
    pub fn open(root: PathBuf, slug: String) -> Result<Self> {
        ensure!(valid_slug(&slug), "Invalid native app name: {slug}");
        let (directory, entry) = registry(&root)?
            .remove(&slug)
            .with_context(|| format!("Unknown native app {slug}. Run list to see enabled apps"))?;
        let metadata = read_json(&directory.join("deno.json"))?;
        let dist = relative_to(&directory, &entry.frontend_dist, "Frontend output")?;
        let output = directory.join("build");
        let project = root.join("native/projects").join(&slug);
        let host = project.join("src-tauri");
        let frontend = project.join("frontend");
        let cache = cache_directory(&root, &slug)?;
        Ok(Self {
            root,
            slug,
            entry,
            directory,
            dist,
            output,
            project,
            host,
            frontend,
            cache,
            metadata,
        })
    }

    pub fn version(&self) -> &semver::Version {
        &self.metadata.version
    }

    pub fn has_task(&self, name: &str) -> bool {
        self.metadata.tasks.contains_key(name)
    }

    pub fn port(&self) -> u16 {
        self.entry.port.unwrap_or(1420)
    }

    pub fn package(&self) -> String {
        format!("gwa-{}", self.slug)
    }

    pub fn executable_name(&self) -> String {
        format!("{}{}", self.package(), env::consts::EXE_SUFFIX)
    }

    pub fn icon(&self) -> Result<PathBuf> {
        let native = self.root.join("native");
        let path = if let Some(icon) = &self.entry.icon {
            relative_to(&native, icon, "Native icon")?
        } else {
            let folder_name = self
                .directory
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or(&self.slug);
            [
                self.directory.join("icon.png"),
                self.directory.join("icon.svg"),
                native.join("icons").join(format!("{}.png", self.slug)),
                native.join("icons").join(format!("{}.svg", self.slug)),
                self.directory
                    .join(format!("src/lib/assets/img/{}.svg", self.slug)),
                self.directory
                    .join(format!("src/lib/assets/img/{folder_name}.svg")),
                self.directory.join("src/lib/assets/img/svelte.svg"),
                native.join("host/icons/icon.png"),
            ]
            .into_iter()
            .find(|path| path.is_file())
            .with_context(|| format!("No icon for {}. Put icon.png or icon.svg in the app directory, or set deno.json native.icon", self.slug))?
        };
        ensure!(
            matches!(
                path.extension().and_then(|ext| ext.to_str()),
                Some("png" | "svg")
            ),
            "Use a square PNG or SVG for {}",
            path.display()
        );
        let path = dunce::canonicalize(&path)
            .with_context(|| format!("Reading icon {}", path.display()))?;
        ensure!(
            path.is_file() && path.starts_with(&self.root),
            "Native icon must be a file inside the client tree"
        );
        Ok(path)
    }

    fn identity(&self) -> Identity {
        Identity {
            identifier: self.entry.identifier.clone(),
            product_name: self
                .entry
                .product_name
                .clone()
                .unwrap_or_else(|| self.slug.clone()),
        }
    }

    pub fn config(&self) -> Result<Value> {
        let mut config: Value = read_json(&self.root.join("native/host/tauri.conf.json"))?;
        if let Some(overrides) = &self.entry.tauri {
            merge(&mut config, overrides.clone());
        }
        let identity = self.identity();
        let hook = |mode| {
            json!({
                "script": format!("cargo run --quiet --locked --target-dir native/runner/target --manifest-path native/runner/Cargo.toml -- frontend {} --mode {mode}", self.slug),
                "cwd": self.root
            })
        };
        merge(
            &mut config,
            json!({
                "identifier": identity.identifier,
                "productName": identity.product_name,
                "version": self.version().to_string(),
                "build": {
                    "beforeBuildCommand": hook("build"),
                    "beforeDevCommand": hook("dev"),
                    "devUrl": format!("http://localhost:{}", self.port()),
                    "frontendDist": self.frontend,
                },
                "bundle": { "icon": ["icons/icon.png"] },
            }),
        );
        if let Some(windows) = config
            .pointer_mut("/app/windows")
            .and_then(Value::as_array_mut)
            && let Some(window) = windows.first_mut().and_then(Value::as_object_mut)
            && self
                .entry
                .tauri
                .as_ref()
                .and_then(|v| v.pointer("/app/windows"))
                .is_none()
        {
            window.insert("title".into(), Value::String(identity.product_name));
        }
        Ok(config)
    }

    pub fn prepare_cache(&self) -> Result<()> {
        let legacy = self.host.join("target");
        fs::create_dir_all(
            self.cache
                .parent()
                .context("Invalid Cargo cache directory")?,
        )?;
        if legacy.is_dir()
            && !self.cache.try_exists()?
            && let Err(error) = fs::rename(&legacy, &self.cache)
        {
            eprintln!(
                "Previous Cargo cache kept at {} ({error})",
                legacy.display()
            );
        }
        Ok(())
    }

    pub fn materialize(&self) -> Result<()> {
        let identity = self.identity();
        let identity_file = self.project.join("identity.json");
        let config_file = self.host.join("tauri.conf.json");
        let previous = if identity_file.try_exists()? {
            Some(read_json::<Identity>(&identity_file)?)
        } else if config_file.try_exists()? {
            Some(read_json::<Identity>(&config_file)?)
        } else {
            None
        };
        ensure!(
            previous.is_none_or(|previous| previous == identity),
            "Native identity changed for {}. Migrate the existing project before building",
            self.slug
        );

        let template = self.root.join("native/host");
        let mut manifest: DocumentMut = fs::read_to_string(template.join("Cargo.toml"))?.parse()?;
        let original_name = manifest["package"]["name"]
            .as_str()
            .context("Host package name is required")?
            .to_owned();
        manifest["package"]["name"] = value(self.package());
        manifest["package"]["version"] = value(self.version().to_string());
        manifest["package"]["license"] = value(self.metadata.license.as_deref().unwrap_or("MIT"));
        let authors: Array = self
            .metadata
            .authors
            .iter()
            .map(|author| author.as_str())
            .collect();
        manifest["package"]["authors"] = value(authors);
        let mut main = fs::read_to_string(template.join("src/main.rs"))?;
        let generated_manifest = self.host.join("Cargo.toml");
        if generated_manifest.is_file() {
            let previous: DocumentMut = fs::read_to_string(&generated_manifest)?.parse()?;
            if let (Some(current), Some(old)) = (
                manifest["lib"]["name"].as_str(),
                previous["lib"]["name"].as_str(),
            ) && current != old
            {
                main = main.replace(&format!("{current}::"), &format!("{old}::"));
                manifest["lib"]["name"] = value(old);
            }
        }
        let mut lock: DocumentMut = fs::read_to_string(template.join("Cargo.lock"))?.parse()?;
        let packages = lock["package"]
            .as_array_of_tables_mut()
            .context("Host lockfile package list is required")?;
        let package = packages
            .iter_mut()
            .find(|row| row.get("source").is_none() && row["name"].as_str() == Some(&original_name))
            .context("Host package missing from its lockfile")?;
        package["name"] = value(self.package());
        package["version"] = value(self.version().to_string());
        write_changed(&generated_manifest, manifest.to_string().as_bytes())?;
        write_changed(&self.host.join("Cargo.lock"), lock.to_string().as_bytes())?;
        write_changed(&self.host.join("src/main.rs"), main.as_bytes())?;
        for name in ["build.rs", "src/lib.rs"] {
            write_changed(&self.host.join(name), &fs::read(template.join(name))?)?;
        }
        write_json(&config_file, &self.config()?)?;
        write_json(&identity_file, &identity)?;
        Ok(())
    }

    pub fn verify_dist(&self) -> Result<()> {
        ensure!(
            self.dist.join("index.html").is_file(),
            "Frontend build must produce {}",
            self.dist.join("index.html").display()
        );
        let dist = dunce::canonicalize(&self.dist)?;
        if dist == self.directory || !dist.starts_with(&self.directory) {
            bail!(
                "Frontend output must stay inside {}",
                self.directory.display()
            );
        }
        Ok(())
    }
}

fn write_json(path: &Path, value: &impl Serialize) -> Result<()> {
    let mut contents = serde_json::to_vec_pretty(value)?;
    contents.push(b'\n');
    write_changed(path, &contents)?;
    Ok(())
}

fn merge(base: &mut Value, patch: Value) {
    if let (Some(base), Value::Object(patch)) = (base.as_object_mut(), &patch) {
        for (key, value) in patch {
            merge(base.entry(key).or_insert(Value::Null), value.clone());
        }
    } else {
        *base = patch;
    }
}
