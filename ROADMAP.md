# GWA Project Roadmap

This document outlines the planned development trajectory for the General Web App (GWA) project. Our goal is to continuously enhance GWA as a premier full-stack application template, focusing on developer experience, robustness, and cutting-edge features.

## Guiding Principles

*   **Developer Experience:** Prioritize ease of use, clear documentation, and rapid development.
*   **Type Safety:** Maintain and enhance end-to-end type safety across the stack.
*   **Modularity & Extensibility:** Design GWA to be adaptable to various project needs.
*   **Modern & Performant:** Leverage the best of modern technologies for optimal performance.
*   **Community Driven (Future Goal):** Foster a community to contribute and guide GWA's evolution.

---

## Version Milestones

### ✅ [Version 0.1.0]((https://github.com/Yrrrrrf/gwa/releases/tag/v0.1.0)): "The Foundation" *(Released: 2025-06-07)*

*   **Theme:** Establish a stable, manually adaptable full-stack template.
*   **Key Features:**
    *   Core stack: PostgreSQL, Python/FastAPI (`prism-py`), Deno/SvelteKit 5 (`prism-ts`), Tauri.
    *   End-to-end type safety demonstration.
    *   Docker-compose setup for backend (DB & API) and frontend app.
    *   Basic database schema initialization (`account`, `auth`).
    *   Tauri integration for desktop app builds.
    *   Initial CI/CD workflows (container build, basic tests).
    *   Comprehensive [`README.md`](README.md) including manual setup instructions for adapting the template.
    *   [`CHANGELOG.md`](/CHANGELOG.md) initiated.
    *   Basic issue templates for GitHub.

### 🚧 Version 0.2.0: "The Scaffolder" (In Progress / Next Release)

*   **Theme:** Introduce an automated project scaffolding tool for enhanced developer onboarding.
*   **Key Features:**
    *   **GWA Scaffolding CLI (`gwa-init` or similar):**
        *   Interactive TUI (Terminal User Interface) built with Rust (`ratatui` or similar).
        *   Prompts for project name, author, identifiers, version, description, etc.
        *   Automatically renames files and replaces placeholder values throughout the template.
        *   Option to initialize a new Git repository.
        *   (Stretch) Option to include/exclude Tauri desktop setup.
    *   **Template Parameterization:** Refine GWA codebase with clear, consistent placeholders for the scaffolder.
    *   **Improved Documentation:** Update setup guides to incorporate the new scaffolding tool.
    *   **Frontend Testing Foundation:** Introduce basic frontend unit/component testing setup (e.g., Vitest).

### Long-Term Vision (v1.0.0 and Beyond)

*   **Theme:** GWA as a mature, highly reliable, and widely adopted project starter.
*   **Potential Goals:**
    *   Extensive plugin system or modular architecture.
    *   Rich ecosystem of community-contributed extensions or modules.
    *   Enterprise-ready features (advanced security, monitoring, scalability).
    *   Official `create-gwa-app` package on relevant package managers (e.g., `cargo`, `npm` via Deno compatibility).

---

## Contributing

We welcome contributions! Please see `CONTRIBUTING.md` (to be created) for guidelines on how to contribute to the project. You can also check out our [issue tracker](https://github.com/Yrrrrrf/gwa/issues) for open tasks and discussions.

---

*This roadmap is a living document and subject to change based on project priorities, community feedback, and evolving technologies.*
