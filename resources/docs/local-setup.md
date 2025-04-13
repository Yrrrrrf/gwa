# Configuración Local con Docker

Esta guía muestra los comandos necesarios para ejecutar GWA localmente usando Docker.

## Configuración Inicial

Antes de comenzar, asegúrate de tener:
- Docker y Docker Compose instalados
- Archivo `.env` con la configuración básica

Crea un archivo `.env` en la raíz del proyecto:
```sh
cat > .env << 'EOF'
DB_NAME=gwa
DB_OWNER_ADMIN=gwa_owner
DB_OWNER_PWORD=password
DB_HOST=gwa-db
EOF
```

## Usando Docker Compose (Recomendado)

Docker Compose simplifica la gestión de múltiples contenedores:

```sh
# Iniciar todos los servicios
docker compose up

# Iniciar en modo detached (segundo plano)
docker compose up -d

# Ver logs
docker compose logs -f

# Detener todos los servicios
docker compose down

# Reconstruir contenedores e iniciar
docker compose up --build

# Iniciar servicios específicos
docker compose up db
docker compose up api
```

## Comandos Individuales para Contenedores

### Base de Datos

```sh
# Construir imagen
docker build -t gwa/db:pgsql -f ./server/db/db.Dockerfile ./server/db

# Ejecutar contenedor
docker run --env-file ./.env --rm -d --name gwa-db gwa/db:pgsql

# Acceder a PostgreSQL (sh/sh)
source .env  # Cargar variables de entorno
docker exec -it gwa-db psql -U $DB_OWNER_ADMIN -d $DB_NAME

# Acceder a PostgreSQL (PowerShell)
$env_vars = Get-Content .env | ForEach-Object { $_ -replace "="," " } | ConvertFrom-StringData
docker exec -it gwa-db psql -U $env_vars.DB_OWNER_ADMIN -d $env_vars.DB_NAME
```

### API

```sh
# Construir imagen
docker build -t gwa/api -f ./server/api/api.Dockerfile ./server/api

# Ejecutar contenedor con hot reload
docker run --env-file ./.env \
  --rm -d \
  --name gwa-api \
  -v "${PWD}/server/api:/app" \
  -p 8000:8000 \
  gwa/api
```

## Verificación de Servicios

```sh
# Verificar contenedores en ejecución
docker ps

# Verificar estado de servicios de Docker Compose
docker compose ps

# Verificar logs
docker compose logs db
docker compose logs api

# Verificar API directamente
curl http://localhost:8000/health
```

## Comandos Útiles para Depuración

```sh
# Reiniciar un servicio
docker compose restart api

# Acceder a un contenedor
docker exec -it gwa-api sh

# Ver uso de recursos
docker stats

# Limpiar recursos no utilizados
docker system prune -a
```