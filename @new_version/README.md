# 🔥 Flame AI- MVP Completo

Una plataforma completa para gestionar mensajes de WhatsApp Web, programar envíos automáticos y administrar contactos de forma profesional.

## ✨ Características

- 📱 **Conexión WhatsApp Web**: Conecta tu WhatsApp mediante código QR
- 💬 **Mensajes en Tiempo Real**: Envía y recibe mensajes directamente desde el navegador
- ⏰ **Programación**: Programa mensajes para envío automático
- 👥 **Gestión de Contactos**: Administra todos tus contactos en un solo lugar
- 🔐 **Autenticación Segura**: Sistema de login con JWT
- 📊 **Dashboard Completo**: Estadísticas y métricas en tiempo real
- 🔄 **Sincronización**: Eventos en tiempo real con Socket.IO
- 🐳 **Docker Ready**: Configuración completa para Docker

## 🚀 Inicio Rápido

### Con Docker (Recomendado)

```bash
# Entrar al directorio
cd @new_version

# Para desarrollo
./start.sh

# Para producción
./start-universal.sh --prod
```

**¡Eso es todo!** Los scripts automáticamente:
- ✅ Verifican que Docker esté instalado y ejecutándose
- ✅ Crean los directorios necesarios
- ✅ Construyen los contenedores
- ✅ Inician los servicios
- ✅ Esperan a que estén listos
- ✅ **Ejecutan la migración completa de la base de datos**
- ✅ Crean el usuario por defecto
- ✅ Verifican que todo funcione

La aplicación estará disponible en:
- **Frontend**: http://localhost
- **Backend**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### Scripts Disponibles

```bash
# Desarrollo
./start.sh                    # Iniciar en modo desarrollo
./start-universal.sh          # Script universal (desarrollo por defecto)

# Producción
./start-universal.sh --prod   # Iniciar en modo producción
./deploy-production.sh        # Despliegue completo en producción
./fix-database.sh             # Solucionar problemas de base de datos

# Utilidades
./stop.sh                     # Detener servicios
./test-docker.sh              # Probar todo el sistema
./clean.sh                    # Limpiar todo (incluyendo datos)
```

### Comandos Docker Útiles

```bash
# Ver logs en tiempo real
docker-compose logs -f

# Ver estado de contenedores
docker-compose ps

# Limpiar todo (incluyendo datos)
docker-compose down --rmi all --volumes

# Para producción
docker-compose -f docker-compose.prod.yml logs -f
docker-compose -f docker-compose.prod.yml ps
```

### Desarrollo Local

#### Backend
```bash
cd backend
npm install
cp env.example .env
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🔑 Credenciales por Defecto

- **Email**: `admin@flame.com`
- **Contraseña**: `flame123`

## 📁 Estructura del Proyecto

```
@new_version/
├── backend/                 # API Backend (Node.js + TypeScript)
│   ├── src/
│   │   ├── config/         # Configuración de BD y servicios
│   │   ├── controllers/    # Controladores de API
│   │   ├── middleware/     # Middleware de autenticación
│   │   ├── routes/         # Rutas de API
│   │   ├── services/       # Servicios de negocio
│   │   ├── types/          # Tipos TypeScript
│   │   └── server.ts       # Servidor principal
│   ├── data/              # Base de datos SQLite
│   ├── sessions/          # Sesiones de WhatsApp
│   └── Dockerfile
├── frontend/               # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Páginas de la aplicación
│   │   ├── services/      # Servicios de API y Socket
│   │   ├── stores/        # Estados globales (Zustand)
│   │   ├── types/         # Tipos TypeScript
│   │   └── App.tsx        # Componente principal
│   └── Dockerfile
└── docker-compose.yml     # Configuración Docker Compose
```

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **Socket.IO** - Comunicación en tiempo real
- **@whiskeysockets/baileys** - Cliente WhatsApp
- **SQLite** - Base de datos
- **JWT** - Autenticación
- **node-cron** - Tareas programadas
- **QRCode** - Generación de códigos QR

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Tailwind CSS** - Estilos
- **React Router** - Navegación
- **Zustand** - Estado global
- **Socket.IO Client** - Tiempo real
- **React Hook Form** - Formularios
- **React Hot Toast** - Notificaciones

## 📱 Funcionalidades Principales

### 1. Autenticación
- ✅ Login/Register con validación
- ✅ JWT tokens seguros
- ✅ Protección de rutas
- ✅ Gestión de sesiones

### 2. WhatsApp Integration
- ✅ Conexión via QR code
- ✅ Detección automática de conexión
- ✅ Manejo de eventos en tiempo real
- ✅ Reconexión automática
- ✅ Gestión de sesiones persistentes

### 3. Mensajería
- ✅ Envío de mensajes de texto
- ✅ Recepción en tiempo real
- ✅ Historial de conversaciones
- ✅ Estado de mensajes
- 🔄 Soporte para multimedia (próximamente)

### 4. Contactos
- ✅ Sincronización automática
- ✅ Búsqueda y filtrado
- ✅ Gestión de grupos e individuales
- ✅ Información detallada

### 5. Programación
- ✅ Crear programación
- ✅ Ejecución automática con cron
- ✅ Gestión de estados (pendiente/enviado/fallido)
- ✅ Reintento de mensajes fallidos
- ✅ Historial completo

### 6. Dashboard
- ✅ Estadísticas en tiempo real
- ✅ Estado de conexión
- ✅ Resumen de actividad
- ✅ Acciones rápidas

## 🔧 Configuración

### Variables de Entorno (Backend)

```env
# Server
PORT=3001
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost

# Database
DB_PATH=./data/whatsapp_manager.db

# WhatsApp
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_QR_TIMEOUT=120000
WHATSAPP_CONNECT_TIMEOUT=60000

# Logging
LOG_LEVEL=info
```

## 🧪 Testing

### Probar Backend
```bash
cd backend
npm run build
node dist/server.js
```

### Probar Frontend
```bash
cd frontend
npm run build
npm run preview
```

### Health Check
```bash
curl http://localhost:3001/health
```

## 📊 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registrarse
- `GET /api/auth/profile` - Obtener perfil
- `PUT /api/auth/profile` - Actualizar perfil

### WhatsApp
- `POST /api/whatsapp/session` - Crear sesión
- `GET /api/whatsapp/qr` - Obtener código QR
- `GET /api/whatsapp/status` - Estado de conexión
- `POST /api/whatsapp/send` - Enviar mensaje
- `GET /api/whatsapp/contacts` - Obtener contactos
- `GET /api/whatsapp/messages/:contactId` - Obtener mensajes
- `POST /api/whatsapp/disconnect` - Desconectar
- `GET /api/whatsapp/stats` - Estadísticas

### Programación
- `POST /api/scheduled` - Crear programación
- `GET /api/scheduled` - Obtener programación
- `GET /api/scheduled/:id` - Obtener mensaje por ID
- `PUT /api/scheduled/:id` - Actualizar mensaje
- `DELETE /api/scheduled/:id` - Eliminar mensaje
- `POST /api/scheduled/:id/cancel` - Cancelar mensaje

## 🔄 Socket Events

### Cliente → Servidor
- `ping` - Mantener conexión viva

### Servidor → Cliente
- `whatsapp:qr` - Nuevo código QR
- `whatsapp:connected` - WhatsApp conectado
- `whatsapp:disconnected` - WhatsApp desconectado
- `whatsapp:message` - Nuevo mensaje
- `whatsapp:contact` - Contacto actualizado
- `notification` - Notificaciones generales

## 🐳 Despliegue con Docker

### Desarrollo
```bash
docker-compose up
```

### Producción
```bash
docker-compose -f docker-compose.yml up -d
```

### Ver logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Backup de datos
```bash
docker cp whatsapp-manager-backend:/app/data ./backup-data
docker cp whatsapp-manager-backend:/app/sessions ./backup-sessions
```

## 🚀 Despliegue en Producción - AWS Linux

### Requisitos Previos

- **EC2 Instance**: Ubuntu 20.04+ o Amazon Linux 2
- **RAM Mínima**: 2GB (recomendado 4GB+)
- **Almacenamiento**: 20GB+ (SSD recomendado)
- **Puertos**: 80, 443, 3001 (configurar Security Groups)

### 1. Preparación del Servidor

```bash
# Actualizar sistema
sudo yum update -y  # Amazon Linux
# sudo apt update && sudo apt upgrade -y  # Ubuntu

# Instalar Docker
sudo yum install -y docker  # Amazon Linux
# sudo apt install -y docker.io  # Ubuntu

# Iniciar Docker
sudo systemctl start docker
sudo systemctl enable docker

# Agregar usuario al grupo docker
sudo usermod -a -G docker ec2-user
# sudo usermod -a -G docker ubuntu  # Ubuntu

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reiniciar sesión para aplicar cambios
exit
```

### 2. Configuración de Seguridad

```bash
# Configurar firewall
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload

# O para Ubuntu con ufw:
# sudo ufw allow 80
# sudo ufw allow 443
# sudo ufw allow 3001
# sudo ufw enable
```

### 3. Configuración de Variables de Entorno

```bash
# Crear archivo .env para producción
cat > .env << EOF
# Servidor
NODE_ENV=production
PORT=3001

# JWT (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET=tu-clave-super-secreta-de-produccion-2024
JWT_EXPIRES_IN=7d

# CORS (IMPORTANTE: Usar tu dominio real)
CORS_ORIGIN=http://tu-dominio.com,https://tu-dominio.com

# Base de datos
DB_HOST=postgres
DB_PORT=5432
DB_NAME=whatsapp_manager
DB_USER=whatsapp_user
DB_PASSWORD=tu-password-seguro-de-produccion

# Redis
REDIS_URL=redis://redis:6379
REDIS_DB=0

# WhatsApp
WHATSAPP_SESSION_PATH=/app/sessions
WHATSAPP_QR_TIMEOUT=120000
WHATSAPP_CONNECT_TIMEOUT=60000

# Logging
LOG_LEVEL=info
EOF
```

### 4. Configuración de Docker Compose para Producción

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: whatsapp-manager-postgres
    environment:
      POSTGRES_DB: whatsapp_manager
      POSTGRES_USER: whatsapp_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=C"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    restart: unless-stopped
    networks:
      - whatsapp-manager-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U whatsapp_user -d whatsapp_manager"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: whatsapp-manager-redis
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - whatsapp-manager-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: whatsapp-manager-backend
    ports:
      - "3001:3001"
    env_file:
      - .env
    volumes:
      - backend_sessions:/app/sessions
      - backend_logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - whatsapp-manager-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: whatsapp-manager-frontend
    ports:
      - "80:80"
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - whatsapp-manager-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s

  # Nginx Reverse Proxy (Opcional pero recomendado)
  nginx:
    image: nginx:alpine
    container_name: whatsapp-manager-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl  # Para certificados SSL
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - whatsapp-manager-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  backend_sessions:
    driver: local
  backend_logs:
    driver: local

networks:
  whatsapp-manager-network:
    driver: bridge
```

### 5. Configuración de Nginx (Opcional)

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }

    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name tu-dominio.com;

        # Redirigir HTTP a HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name tu-dominio.com;

        # Configuración SSL
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # API Backend
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 6. Despliegue y Monitoreo

```bash
# Clonar repositorio
git clone tu-repositorio.git
cd tu-repositorio

# Configurar variables de entorno
cp .env.example .env
nano .env  # Editar con valores de producción

# Iniciar servicios
docker-compose -f docker-compose.prod.yml up -d

# Verificar estado
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f

# Monitoreo continuo
watch -n 5 'docker-compose -f docker-compose.prod.yml ps'
```

### 7. Scripts de Automatización

```bash
# deploy.sh
#!/bin/bash
set -e

echo "🚀 Iniciando despliegue en producción..."

# Backup de datos existentes
if [ -d "backup" ]; then
    echo "📦 Creando backup..."
    docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U whatsapp_user whatsapp_manager > backup/db_$(date +%Y%m%d_%H%M%S).sql
fi

# Actualizar código
echo "📥 Actualizando código..."
git pull origin main

# Reconstruir y reiniciar
echo "🔨 Reconstruyendo servicios..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up --build -d

# Verificar salud
echo "🏥 Verificando salud de servicios..."
sleep 30
docker-compose -f docker-compose.prod.yml ps

echo "✅ Despliegue completado!"
```

### 8. Consideraciones de Seguridad

#### Variables de Entorno Críticas
```bash
# NUNCA usar valores por defecto en producción
JWT_SECRET=clave-super-secreta-unica-para-produccion-2024
DB_PASSWORD=password-super-seguro-para-produccion
CORS_ORIGIN=https://tu-dominio.com,https://www.tu-dominio.com
```

#### Configuración de Firewall
```bash
# Solo abrir puertos necesarios
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=22/tcp  # SSH
sudo firewall-cmd --reload
```

#### Backup Automático
```bash
# backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ec2-user/backups"

mkdir -p $BACKUP_DIR

# Backup de base de datos
docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U whatsapp_user whatsapp_manager > $BACKUP_DIR/db_$DATE.sql

# Backup de sesiones WhatsApp
docker cp whatsapp-manager-backend:/app/sessions $BACKUP_DIR/sessions_$DATE

# Limpiar backups antiguos (mantener últimos 7 días)
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "sessions_*" -mtime +7 -exec rm -rf {} \;

echo "Backup completado: $DATE"
```

### 9. Monitoreo y Logs

```bash
# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml logs -f

# Ver logs específicos
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f postgres

# Monitoreo de recursos
docker stats

# Verificar salud de servicios
curl -f http://localhost:3001/health
curl -f http://localhost/
```

### 10. Troubleshooting Común en Producción

#### Error de CORS
```bash
# Verificar configuración CORS
docker exec whatsapp-manager-backend env | grep CORS
# Debe mostrar: CORS_ORIGIN=https://tu-dominio.com
```

#### Base de Datos No Inicializa
```bash
# Limpiar y recrear
docker-compose -f docker-compose.prod.yml down
docker volume rm new_version_postgres_data
docker-compose -f docker-compose.prod.yml up -d
```

#### WhatsApp No Se Conecta
```bash
# Verificar logs de WhatsApp
docker-compose -f docker-compose.prod.yml logs backend | grep -i whatsapp

# Limpiar sesiones si es necesario
docker exec whatsapp-manager-backend rm -rf /app/sessions/*
```

### 11. Optimizaciones de Rendimiento

```bash
# Configurar límites de memoria
docker-compose -f docker-compose.prod.yml exec redis redis-cli CONFIG SET maxmemory 256mb
docker-compose -f docker-compose.prod.yml exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Monitorear uso de recursos
docker stats --no-stream
```

### 12. Actualizaciones Automáticas (Opcional)

```bash
# crontab -e
# Actualizar cada día a las 2 AM
0 2 * * * cd /home/ec2-user/tu-proyecto && ./deploy.sh >> /var/log/deploy.log 2>&1

# Backup diario a las 3 AM
0 3 * * * cd /home/ec2-user/tu-proyecto && ./backup.sh >> /var/log/backup.log 2>&1
```

### ⚠️ Consideraciones Importantes

1. **Dominio y SSL**: Configura un dominio real y certificados SSL
2. **Backup Regular**: Implementa backups automáticos de la base de datos
3. **Monitoreo**: Configura alertas para caídas de servicio
4. **Seguridad**: Cambia todas las contraseñas por defecto
5. **Recursos**: Monitorea el uso de CPU y memoria
6. **Logs**: Implementa rotación de logs para evitar llenar el disco
7. **Actualizaciones**: Mantén Docker y las imágenes actualizadas

### 🔧 Comandos Útiles para Producción

```bash
# Reiniciar solo un servicio
docker-compose -f docker-compose.prod.yml restart backend

# Ver estado detallado
docker-compose -f docker-compose.prod.yml ps -a

# Limpiar recursos no utilizados
docker system prune -f

# Ver uso de espacio
docker system df

# Backup rápido
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U whatsapp_user whatsapp_manager > backup.sql
```

## 🔒 Seguridad

- ✅ Autenticación JWT
- ✅ CORS configurado
- ✅ Helmet para headers de seguridad
- ✅ Validación de entrada
- ✅ Rate limiting
- ✅ Sanitización de datos

## 🐛 Troubleshooting

### WhatsApp no se conecta
1. Verificar que el código QR no haya expirado
2. Asegurar que WhatsApp Web no esté abierto en otro lugar
3. Revisar logs del backend: `docker-compose logs backend`

### Frontend no carga
1. Verificar que el backend esté ejecutándose
2. Comprobar proxy configuration en vite.config.ts
3. Revisar logs: `docker-compose logs frontend`

### Base de datos
- La base de datos SQLite se crea automáticamente
- Los datos se persisten en volúmenes Docker
- Backup regular recomendado

## 📝 Próximas Características

- 📎 Soporte para multimedia (imágenes, videos, documentos)
- 🤖 Bot automático con respuestas predefinidas
- 📈 Analytics avanzados
- 🔔 Notificaciones push
- 👥 Gestión de equipos
- 🎨 Temas personalizables
- 📱 App móvil
- 🔗 Integración con CRM

## 📄 Licencia

MIT License - Ver LICENSE file para más detalles.

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

---

**¡Listo para usar! 🎉**

Desarrollado con ❤️ para optimizar la comunicación profesional via WhatsApp.
