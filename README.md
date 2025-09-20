# 🔥 FLAME Assistant

Una plataforma completa de asistentes de IA para gestión de conversaciones multi-canal con integración a WhatsApp, Facebook, Instagram y Telegram.

## 🚀 Características

- **Gestión de Conversaciones** en tiempo real
- **Asistentes de IA** personalizables con diferentes tipos de respuestas
- **Integraciones** con WhatsApp, Facebook, Instagram y Telegram
- **Sistema de Horarios** para respuestas automáticas
- **Dashboard** completo con analytics
- **Autenticación** segura con JWT
- **WebSocket** para comunicación en tiempo real
- **Docker** para fácil despliegue

## 🏗️ Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   AI Services   │
│   (React + Vite)│◄──►│   (Node.js)     │◄──►│   (OpenAI/etc)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   (Database)    │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Redis Cache   │
                       │   (Sessions)    │
                       └─────────────────┘
```

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** con TypeScript
- **Vite** como bundler
- **Tailwind CSS** para estilos
- **Socket.io-client** para WebSocket
- **React Router** para navegación

### Backend
- **Node.js 18** con TypeScript
- **Express.js** como framework
- **PostgreSQL** como base de datos principal
- **Redis** para cache y sesiones
- **Socket.io** para WebSocket
- **JWT** para autenticación

### DevOps
- **Docker** y **Docker Compose**
- **Nginx** para proxy reverso (opcional)

## 📦 Instalación y Configuración

### Prerrequisitos

- Node.js 18+
- Docker y Docker Compose
- Git

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd flame-assistant
```

### 2. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp backend/env.example backend/.env

# Editar variables de entorno
nano backend/.env
```

### 3. Iniciar con Docker Compose

```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar servicios
docker-compose down
```

### 4. Acceder a la aplicación

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 🔧 Desarrollo

### Estructura del Proyecto

```
flame-assistant/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── controllers/     # Controladores de rutas
│   │   ├── services/        # Lógica de negocio
│   │   ├── models/          # Modelos de base de datos
│   │   ├── middleware/      # Middleware personalizado
│   │   ├── routes/          # Definición de rutas
│   │   ├── utils/           # Utilidades
│   │   ├── config/          # Configuraciones
│   │   └── types/           # Tipos TypeScript
│   ├── scripts/             # Scripts de utilidad
│   ├── Dockerfile
│   └── docker-compose.yml
├── src/                     # Frontend
│   ├── components/          # Componentes React
│   ├── pages/              # Páginas de la aplicación
│   ├── contexts/           # Contextos de React
│   ├── hooks/              # Hooks personalizados
│   ├── services/           # Servicios de API
│   ├── config/             # Configuración
│   └── utils/              # Utilidades
└── docker-compose.yml      # Docker Compose principal
```

### Comandos de Desarrollo

```bash
# Backend
cd backend
npm install
npm run dev          # Modo desarrollo
npm run build        # Compilar
npm run start        # Producción
npm run test         # Tests

# Frontend
npm install
npm run dev          # Modo desarrollo
npm run build        # Compilar
npm run preview      # Preview de producción
```

## 🔐 Autenticación

El sistema utiliza JWT para autenticación:

- **Access Token**: Válido por 24 horas
- **Refresh Token**: Válido por 7 días
- **Almacenamiento**: LocalStorage en el frontend
- **Renovación**: Automática cuando el access token expira

### Endpoints de Autenticación

```typescript
POST /api/auth/register      # Registro
POST /api/auth/login         # Inicio de sesión
POST /api/auth/refresh-token # Renovar token
POST /api/auth/logout        # Cerrar sesión
GET  /api/auth/profile       # Obtener perfil
PUT  /api/auth/profile       # Actualizar perfil
```

## 📊 API Endpoints

### Conversaciones
```typescript
GET    /api/conversations              # Listar conversaciones
POST   /api/conversations              # Crear conversación
GET    /api/conversations/:id          # Obtener conversación
PUT    /api/conversations/:id          # Actualizar conversación
DELETE /api/conversations/:id          # Eliminar conversación
GET    /api/conversations/:id/messages # Obtener mensajes
POST   /api/conversations/:id/messages # Enviar mensaje
```

### Asistentes
```typescript
GET    /api/assistants                 # Listar asistentes
POST   /api/assistants                 # Crear asistente
GET    /api/assistants/:id             # Obtener asistente
PUT    /api/assistants/:id             # Actualizar asistente
DELETE /api/assistants/:id             # Eliminar asistente
POST   /api/assistants/:id/train       # Entrenar asistente
```

## 🗄️ Base de Datos

### Esquema Principal

- **users**: Usuarios del sistema
- **assistants**: Asistentes de IA
- **conversations**: Conversaciones
- **messages**: Mensajes
- **schedules**: Horarios de asistentes
- **integrations**: Integraciones con plataformas

### Inicialización

La base de datos se inicializa automáticamente con:
- Usuario administrador: `admin@flame-assistant.com` / `admin123`
- Asistentes de ejemplo
- Estructura de tablas e índices

## 🔌 Integraciones

### WhatsApp Business API
- Envío de mensajes
- Recepción de webhooks
- Gestión de contactos

### Facebook/Instagram
- Graph API
- Webhooks de mensajes
- Gestión de páginas

### Telegram
- Bot API
- Comandos personalizados
- Gestión de grupos

## 📱 WebSocket

El sistema incluye WebSocket para:
- Notificaciones en tiempo real
- Actualizaciones de conversaciones
- Mensajes instantáneos
- Estado de conexión

### Eventos WebSocket

```typescript
// Unirse a sala de usuario
socket.emit('join-user-room', userId);

// Unirse a conversación
socket.emit('join-conversation', conversationId);

// Recibir mensajes
socket.on('message', (data) => {
  // Manejar mensaje
});
```

## 🚀 Despliegue

### Producción con Docker

```bash
# Construir imágenes
docker-compose -f docker-compose.prod.yml build

# Iniciar en producción
docker-compose -f docker-compose.prod.yml up -d

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Variables de Entorno de Producción

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
JWT_SECRET=your-production-secret
CORS_ORIGIN=https://yourdomain.com
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test
npm run test:coverage

# Frontend tests
npm run test
npm run test:coverage
```

## 📈 Monitoreo

### Health Check
- **Endpoint**: `/health`
- **Métricas**: Base de datos, Redis, memoria, uptime
- **Estado**: OK/ERROR con detalles

### Logging
- **Archivos**: `logs/combined.log`, `logs/error.log`
- **Niveles**: error, warn, info, debug
- **Formato**: JSON estructurado

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Para soporte y preguntas:
- Crear un issue en GitHub
- Contactar al equipo de desarrollo
- Revisar la documentación en `/docs`

---

**¡Desarrollado con ❤️ por el equipo de FLAME Assistant!**