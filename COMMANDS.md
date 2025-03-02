# Docker Commands Reference

## Containers

### Database

```bash
# Build and run DB container individually (name: gwa/db)
docker build -t gwa/db:pgsql -f ./server/db/db.Dockerfile ./server/db
# add --no-cache to rebuild from scratch
docker run --env-file ./.env gwa/db:pgsql  # Run container in foreground
# * Run in background w/ a name (gwa-db)
docker run --env-file ./.env --rm -d --name gwa-db gwa/db:pgsql
```

#### DB Management
To handle the database you must load the environment variables and connect to the database.

```pwsh
#! pwsh
$env_vars = Get-Content .env | ConvertFrom-StringData  # load environment variables
docker exec -it gwa-db psql -U $env_vars.DB_OWNER_ADMIN -d $env_vars.DB_NAME
```

```bash
#! bash
env_vars=$(cat .env | xargs)  # load environment variables
docker exec -it gwa-db psql -U $DB_OWNER_ADMIN -d $DB_NAME
```

### API

```bash
# Build and run API container individually
docker build -t gwa/api -f ./server/api/api.Dockerfile ./server/api
docker run --env-file ./.env gwa/api  # Run container in foreground
# * Run in background w/ a name (gwa-api)
docker run --env-file ./.env --rm -d --name gwa-api gwa/api     

# Run with bind mount for hot reload
docker run --env-file ./.env `
  --rm -d `  # Remove container when stopped (in detached mode)
  --name gwa-api `  # Name the container (gwa-api)
  -v "${PWD}/server/api:/app" `  # Bind mount the ./server/api directory to /app
  -p 8000:8000 `  # Expose port 8000
  gwa/api  # Use the gwa/api image
```

### Frontend

```bash
# Build and run Frontend container individually
docker build -t gwa/hub -f ./core/hub.Dockerfile ./core
docker run -p 5173:5173  # Run container in foreground
# * Run in background w/ a name (gwa-hub)
docker run --rm -d --name gwa-hub gwa/hub

# Run with bind mount for hot reload
docker run --rm -d --name gwa-hub -v "${PWD}/core:/app" -p 5173:5173 gwa/hub

```

## Compose

```bash
# Using docker-compose (recommended)
docker-compose up gwa-db  # Start the database
docker-compose up gwa-api  # Start the API (depends on the database)
docker-compose up frontend  # Start the frontend (depends on the API)

# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild containers
docker-compose up --build
```
