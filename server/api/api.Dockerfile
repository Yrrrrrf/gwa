FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Set environment variables
# PYTHONDONTWRITEBYTECODE: Prevents Python from writing pyc files to disc
# PYTHONUNBUFFERED: Prevents Python from buffering stdout and stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Use system Python by default
    UV_SYSTEM_PYTHON=1 \
    # Compile bytecode for better runtime performance
    UV_COMPILE_BYTECODE=1 \
    # Use copy instead of hard links for better compatibility with Docker layers
    UV_LINK_MODE=copy

# Install system dependencies for PostgreSQL and build tools
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# COPY project files before installing
COPY pyproject.toml .
COPY src/ ./src/

# Sync the project with uv (using psycopg2-binary instead of psycopg2)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system psycopg2-binary && \
    uv pip install --system -e .

# Define environment variables for the application
ENV DB_NAME='' \
    DB_HOST='' \
    DB_OWNER_ADMIN='' \
    DB_OWNER_PWORD=''

# Expose the port the app runs on
EXPOSE 8000

# Start FastAPI with hot reload for development
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/app"]

# Healthcheck configuration
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1