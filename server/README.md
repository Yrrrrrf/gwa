# GWA Backend Server

This directory contains all backend components for the General Web App (GWA). It's comprised of a PostgreSQL database and a Python-based API powered by FastAPI.

## Overview

The backend is designed to be robust, scalable, and developer-friendly, with a strong emphasis on automatic API generation from the database schema.

*   **Database ([`./db/`](./db/)):**
    *   Utilizes **[PostgreSQL](https://www.postgresql.org/)** (version 16 or higher).
    *   Containerized using **[Docker](https://www.docker.com/)** (see [`./db/db.Dockerfile`](./db/db.Dockerfile)).
    *   Includes comprehensive initialization scripts:
        *   Schema setup: [`./db/init/01-setup/01-setup.sql`](./db/init/01-setup/01-setup.sql)
        *   Table creation: [`./db/init/02-tables/`](./db/init/02-tables/)
        *   Orchestration script: [`./db/scripts/init-db.sh`](./db/scripts/init-db.sh) run by Docker on startup.
    *   Local setup scripts are also available in [`./db/local-setup/`](./db/local-setup/) for non-Dockerized PostgreSQL instances.
*   **API ([`./api/`](./api/)):**
    *   Built with **[Python](https://www.python.org/)** (version 3.12 or higher).
    *   Uses the **[FastAPI](https://fastapi.tiangolo.com/)** framework for high-performance web APIs.
    *   Features **[prism-py](https://pypi.org/project/prism-py/)** for automatic REST API generation directly from the PostgreSQL database schema. See the core logic in [`./api/src/main.py`](./api/src/main.py).
    *   Containerized using **[Docker](https://www.docker.com/)** (see [`./api/api.Dockerfile`](./api/api.Dockerfile)).
    *   Python dependencies are managed with [`uv`](https://github.com/astral-sh/uv) via [`./api/pyproject.toml`](./api/pyproject.toml).
    *   Includes basic API tests in [`./api/test/`](./api/test/).

## Core Principle: Zero-Friction Data Pipeline

A key feature of the GWA backend is its ability to automatically expose your database schema as a fully functional REST API with minimal configuration. This is achieved by [`prism-py`](https://pypi.org/project/prism-py/) introspecting the database and generating the necessary FastAPI routes.

## Usage

The recommended way to run the backend services is using Docker Compose from the project root.

1.  **Prerequisites:**
    *   [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.
    *   A [`.env`](/.env) file in the *project root* (`/.env`) configured with your database credentials (see [root README.md](/README.md#database-configuration) for an example).

2.  **Start Services (from project root):**
    ```bash
    docker compose up -d db api
    ```

3.  **Accessing the API:**
    *   The API will typically be available at [`http://localhost:8000`](http://localhost:8000).
    *   Interactive API documentation (Swagger UI): [`http://localhost:8000/docs`](http://localhost:8000/docs).
    *   Alternative API documentation (ReDoc): [`http://localhost:8000/redoc`](http://localhost:8000/redoc).
    *   Health check: [`http://localhost:8000/health`](http://localhost:8000/health).

4.  **Database Access:**
    *   If you need to connect directly to the PostgreSQL instance running in Docker, it's exposed on port `5432` (or as configured in [`/docker-compose.yml`](/docker-compose.yml)).
    *   You can use tools like `psql` or any database GUI. Refer to the [Local Setup Guide (`../../resources/docs/local-setup.md`)](../../resources/docs/local-setup.md) for connection examples.

5.  **Development (API Hot Reloading):**
    *   The API Docker container ([`./api/api.Dockerfile`](./api/api.Dockerfile)) is configured for hot reloading. Any changes made to the Python code in [`./api/src/`](./api/src/) will automatically restart the Uvicorn server within the container, provided you have mounted the local directory as a volume in your `docker-compose.yml` (which is the default setup).

## Further Information

*   For details on database schema and initialization, explore the [`./db/init/`](./db/init/) directory.
*   For API implementation details, see [`./api/src/main.py`](./api/src/main.py).
*   For Docker configurations, check the respective `Dockerfile`s and the main [`/docker-compose.yml`](/docker-compose.yml).