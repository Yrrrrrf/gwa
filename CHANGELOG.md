# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-rc-0] - 2025-05-04

### Added

* Bumped project version to `0.1.0-rc-0` in metadata and documentation.
* **GitHub Actions CI/CD workflows**:

  * `test-workflow.yml`: checks out code, prints environment info & date/time, and placeholders for custom lint/tests.
  * `docker-compose-test.yml`: spins up the full stack, performs a basic health check on `http://localhost:8000/health`, and tears down containers.
* Drafted initial `CHANGELOG.md` structure and linked compare URLs.

### Changed

* Updated `README.md` and release draft notes to reflect the `0.1.0-rc-0` bump.

## [0.0.5] - 2025-04-15

> **GWA Main Template** — Cross-platform proof-of-concept

A significant milestone featuring complete containerization and mobile platform support proof-of-concept.

### Added

* **Complete Docker Integration**: Full multi-container orchestration for database, API, and frontend.
* **Android Proof-of-Concept**: Initial groundwork for mobile platform support alongside web and desktop (Tauri).
* **End-to-End Type Safety**: Seamless type propagation from PostgreSQL through FastAPI to Svelte UI.
* **Svelte 5 Runes**: Adoption of the new reactive system for frontend components.

### Changed

* Production-ready `docker-compose.yml` with optimized service isolation and volume handling.
* Streamlined build scripts for both development and production environments.
* Updated CI placeholder workflows (to be finalized in v0.1.0).

## [0.0.4] - 2025-04-01

> **Complete Docker Integration** — Foundation for containerized development

### Added

* Full `docker-compose` setup for all services, including network configuration and persistent volumes.

### Fixed

* Deno/Tailwind CSS compatibility issues by adjusting host-bindings and engine settings.

### Changed

* Centralized environment variables using YAML anchors for maintainability.

## [0.0.3] - 2025-03-20

> **Deno & Framework Modernization**

### Added

* Migration to Deno for build & dev workflows.
* Svelte 5 runes integration and Tauri desktop support.

### Changed

* Modernized project scripts (`deno task dev`, `build`, `tauri build`).

## [0.0.2] - 2025-03-10

> **Docker Optimization & Documentation**

### Added

* YAML anchors (`&common-env`) to DRY environment definitions.
* New deployment guides: `local-setup.md`, `unix-setup.md`, `unix-verify.md`.

### Changed

* Enhanced troubleshooting and advanced configuration docs.

## [0.0.1] - 2025-03-01

> **Initial Server Implementation**

### Added

* FastAPI auto-generated endpoints from PostgreSQL schema.
* Containerized PostgreSQL setup with initialization scripts.
* Basic project scaffolding: [`README.md`](./README.md), [`license`](./LICENSE), and starter files.

[0.1.0-rc-0]: https://github.com/Yrrrrrf/gwa/compare/v0.0.5...v0.1.0-rc-0
[0.0.5]: https://github.com/Yrrrrrf/gwa/compare/v0.0.4...v0.0.5
[0.0.4]: https://github.com/Yrrrrrf/gwa/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/Yrrrrrf/gwa/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/Yrrrrrf/gwa/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/Yrrrrrf/gwa/releases/tag/v0.0.1
