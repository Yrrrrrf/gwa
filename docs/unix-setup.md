# Configuración en Servidores Unix ([AWS EC2](https://aws.amazon.com/ec2/))

Esta guía detalla cómo desplegar GWA en un servidor Unix, específicamente en una instancia EC2 de AWS.

## Requisitos Previos

- Instancia EC2 con Ubuntu Server 22.04 LTS
- Acceso SSH a la instancia
- Grupos de seguridad configurados (puertos 22, 80, 443, 8000)

## 1. Conexión a la Instancia

```sh
# Configurar permisos del archivo de clave
chmod 400 clave.pem

# Conectar vía SSH
ssh -i "clave.pem" ubuntu@tu-dns-público-ec2.amazonaws.com
```


## 2. Preparación del Servidor

```sh
# Actualizar el sistema
sudo apt update
sudo apt upgrade -y

# Instalar paquetes necesarios
sudo apt install git curl wget -y
```

## 3. Instalar [Docker](https://docs.docker.com/engine/install/ubuntu/)

```sh
# Dependencias
sudo apt install apt-transport-https ca-certificates curl software-properties-common -y

# Añadir la clave GPG oficial de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Añadir repositorio
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io -y

# Iniciar y habilitar Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verificar instalación
docker --version
```

## 4. Instalar [Docker Compose](https://docs.docker.com/compose/install/linux/)

```sh
# Método preferido para Ubuntu 22.04+
sudo apt install docker-compose-plugin -y

# Verificar instalación
docker compose version
```

## 5. Implementación de [GWA](https://github.com/Yrrrrrf/gwa)

### Clonar el Repositorio

```sh
# Crear directorio para la aplicación
mkdir -p ~/apps
cd ~/apps

# Clonar repositorio
git clone https://github.com/Yrrrrrf/gwa.git
cd gwa
```

### Configurar Variables de Entorno

```sh
# Crear archivo .env
cat > .env << 'EOF'
DB_NAME=gwa
DB_OWNER_ADMIN=gwa_owner
DB_OWNER_PWORD=password_seguro_123
DB_HOST=gwa-db
EOF
```

### Iniciar Servicios

```sh
# Construir e iniciar contenedores en segundo plano
docker compose up -d

# Verificar estado
docker compose ps
```

## 6. Configuración del Firewall (opcional)

```sh
# Instalar y configurar UFW (Uncomplicated Firewall)
sudo apt install ufw -y

# Configurar reglas básicas
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 8000/tcp  # API
sudo ufw allow http
sudo ufw allow https

# Habilitar el firewall
sudo ufw --force enable
sudo ufw status
```

## 7. Acceso a la Aplicación

Obtén la IP pública de tu instancia desde la consola AWS o con:
```sh
curl -s http://checkip.amazonaws.com/
```

Accede a la API:
```
http://[IP-PÚBLICA-DE-TU-INSTANCIA]:8000/docs
```
