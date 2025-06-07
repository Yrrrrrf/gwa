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

### Future (v0.3.0+): "Enrichment & Expansion"

*   **Theme:** Add more features, examples, and improve maturity.
*   **Potential Features (Order & Inclusion TBD based on feedback & priority):**
    *   **Full-fledged Authentication Example:**
        *   Complete JWT-based authentication flow (login, registration, refresh tokens).
        *   Role-based access control (RBAC) demonstrated in API and UI.
        *   Password reset, email verification flows.
    *   **Enhanced `prism-py` / `prism-ts` Capabilities & Examples:**
        *   More complex query examples.
        *   Demonstrate handling of relationships and advanced database features.
        *   Guides on extending auto-generated APIs.
    *   **Concrete Mobile Implementation:**
        *   Full example of building and deploying for Android/iOS using Tauri's mobile support.
        *   Address mobile-specific UI/UX considerations.
    *   **Advanced `rune-lab` Integration:**
        *   Showcase a wider array of `rune-lab` components in a demo application.
        *   Potentially a dedicated "kitchen sink" page for `rune-lab`.
    *   **Real-time Features:**
        *   Example integration of WebSockets for real-time updates (e.g., notifications, live data).
    *   **Database Migration Strategy:**
        *   Integrate or recommend a database migration tool (e.g., Alembic for Python, Deno-based tool).
        *   Provide guidance on managing schema changes.
    *   **More Sophisticated Backend Examples:**
        *   Demonstrate background tasks, caching strategies, and interaction with other services.
    *   **Internationalization (i18n) Support:**
        *   Showcase how to implement multi-language support in the SvelteKit frontend.
    *   **Comprehensive Test Suite:**
        *   Expand backend and frontend test coverage, including integration and E2E tests.
    *   **Performance Optimization Guides:**
        *   Tips and examples for optimizing frontend and backend performance.
    *   **Deployment Guides for Various Platforms:**
        *   Expand beyond local Docker and basic Unix server (e.g., Vercel, Netlify, Fly.io, Kubernetes).

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