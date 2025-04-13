<h1 align="center">
  <img src="./resources/img/gwa-no-bg.png" alt="General Web App Icon" width="128" height="128" description="Some atom that represents the app (like the most basic element of some complex system)">
  <div align="center">General Web App</div>
</h1>

<div align="center">

<!-- ![Version](https://img.shields.io/badge/version-1.0.0-blue.svg) -->
[![GitHub: GWA](https://img.shields.io/badge/GitHub-GWA-181717?logo=github)](https://github.com/Yrrrrrf/gwa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://choosealicense.com/licenses/mit/)

</div>

## 🚀 Overview

General Web App (GWA) is a comprehensive, full-stack application template designed for rapidly developing modern, type-safe, and data-driven applications. By integrating best-in-class technologies, GWA provides a robust foundation that seamlessly bridges backend database operations with type-safe frontend interfaces.

The key innovation in GWA is the **zero-friction data pipeline** between your database schema and client applications, powered by [**prism-py**](https://github.com/Yrrrrrf/prism-py) and [**ts-forge**](https://github.com/Yrrrrrf/ts-forge). This ensures complete type safety and automatic API generation from your database to your frontend with minimal configuration.

## ✨ Features

- **Automatic API Generation** - Generate complete REST APIs directly from your database schema
- **End-to-End Type Safety** - Seamless type propagation from database to frontend
- **Cross-Platform** - Deploy as a web app, desktop application, or mobile app
- **Modern Stack** - Built with cutting-edge technologies focused on developer experience
- **Production Ready** - Includes Docker setup, authentication, and CI/CD templates

## 🛠️ Technology Stack

### Backend

- **[Python](https://www.python.org/)** - High-level programming language
    - **[FastAPI](https://fastapi.tiangolo.com/)** - High-performance API framework
    - **[prism-py](https://github.com/Yrrrrrf/prism-py)** - Automatic API generation from database schemas
- **[PostgreSQL](https://www.postgresql.org/)** - Robust and scalable database

### Frontend

- **[SvelteKit](https://kit.svelte.dev/)** - Full-stack Svelte framework with SSR capabilities
    - **[Tauri](https://tauri.app/)** - Build desktop applications with web technologies
- **[rune-lab](https://github.com/Yrrrrrf/rune-lab)** - UI component library built with Svelte 5
    - **[ts-forge](https://github.com/Yrrrrrf/ts-forge)** - Type-safe API client generation
- **[TailwindCSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[DaisyUI](https://daisyui.com/)** - Component library for TailwindCSS

## 🚦 Getting Started

### Prerequisites

- [Python](https://www.python.org/) >=3.10
- [Node.js](https://nodejs.org/) >=18 or [Bun](https://bun.sh/) >=1.0
- [PostgreSQL](https://www.postgresql.org/) >=13
- [Docker](https://www.docker.com/) (optional, for containerized setup)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/Yrrrrrf/gwa.git
cd general-web-app

# # Option 1: Local Setup
# # Backend setup
# cd backend
# pip install -r requirements.txt
# python -m src.main

# # Frontend setup
# cd ../core
# bun install  # or npm install
# bun dev      # or npm run dev

# Option 2 *recommended*: Docker Setup
docker-compose up -d
```

### Database Configuration

Create a [`.env`](.env) file in the root directory:

```env
DB_NAME=gwa
DB_OWNER_ADMIN=gwa_owner
DB_OWNER_PWORD=password
DB_HOST=localhost
```

<!-- ## 📖 Documentation

- [Project Structure](./docs/project-structure.md)
- [API Documentation](./docs/api.md)
- [Component Library](./docs/components.md)
- [Deployment Guide](./docs/deployment.md) -->

<!-- ## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
bun test  # or npm test
``` -->

<!-- ## 🔄 CI/CD

GWA includes GitHub Actions workflows for:

- Automated testing
- Docker image building
- Deployment to various environments -->

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

<!-- ## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request -->
