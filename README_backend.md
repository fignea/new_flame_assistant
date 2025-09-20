# 🔥 FLAME Assistant - Backend Documentation

## 📋 Tabla de Contenidos
- [Descripción General](#descripción-general)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Base de Datos](#base-de-datos)
- [APIs y Endpoints](#apis-y-endpoints)
- [Autenticación y Seguridad](#autenticación-y-seguridad)
- [Integraciones](#integraciones)
- [Configuración](#configuración)
- [Despliegue](#despliegue)
- [Testing](#testing)
- [Monitoreo](#monitoreo)

## 🎯 Descripción General

FLAME Assistant es una plataforma de asistentes de IA que permite gestionar conversaciones multi-canal, crear asistentes personalizados y automatizar respuestas. El backend debe soportar:

- **Gestión de Conversaciones** en tiempo real
- **Asistentes de IA** con diferentes tipos de respuestas
- **Integraciones** con WhatsApp, Facebook, Instagram, etc.
- **Sistema de Horarios** para respuestas automáticas
- **Gestión de Usuarios** y autenticación
- **Analytics** y métricas de rendimiento

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   AI Services   │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (OpenAI/etc)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Database      │
                       │   (PostgreSQL)  │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Redis Cache   │
                       │   (Sessions)    │
                       └─────────────────┘
```

## 🛠️ Stack Tecnológico

### Core Backend
- **Node.js** (v18+) - Runtime principal
- **Express.js** - Framework web
- **TypeScript** - Tipado estático
- **PostgreSQL** - Base de datos principal
- **Redis** - Cache y sesiones
- **Socket.io** - Comunicación en tiempo real

### Autenticación y Seguridad
- **JWT** - Tokens de autenticación
- **bcrypt** - Hash de contraseñas
- **helmet** - Seguridad HTTP
- **cors** - Configuración CORS
- **rate-limiter** - Limitación de requests

### Integraciones
- **WhatsApp Business API** - WhatsApp
- **Facebook Graph API** - Facebook/Instagram
- **OpenAI API** - IA y procesamiento de lenguaje
- **Webhook handlers** - Recepción de mensajes

### Herramientas de Desarrollo
- **Jest** - Testing
- **ESLint** - Linting
- **Prettier** - Formateo de código
- **Docker** - Containerización
- **PM2** - Gestión de procesos

## 📁 Estructura del Proyecto

```
backend/
├── src/
│   ├── controllers/          # Controladores de rutas
│   │   ├── auth.controller.ts
│   │   ├── conversations.controller.ts
│   │   ├── assistants.controller.ts
│   │   ├── integrations.controller.ts
│   │   └── users.controller.ts
│   ├── services/            # Lógica de negocio
│   │   ├── auth.service.ts
│   │   ├── conversation.service.ts
│   │   ├── assistant.service.ts
│   │   ├── integration.service.ts
│   │   ├── ai.service.ts
│   │   └── notification.service.ts
│   ├── models/              # Modelos de base de datos
│   │   ├── User.ts
│   │   ├── Conversation.ts
│   │   ├── Message.ts
│   │   ├── Assistant.ts
│   │   ├── Integration.ts
│   │   └── Schedule.ts
│   ├── middleware/          # Middleware personalizado
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/              # Definición de rutas
│   │   ├── auth.routes.ts
│   │   ├── conversations.routes.ts
│   │   ├── assistants.routes.ts
│   │   ├── integrations.routes.ts
│   │   └── webhooks.routes.ts
│   ├── utils/               # Utilidades
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   ├── config/              # Configuraciones
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── jwt.config.ts
│   │   └── integrations.config.ts
│   ├── types/               # Tipos TypeScript
│   │   ├── auth.types.ts
│   │   ├── conversation.types.ts
│   │   ├── assistant.types.ts
│   │   └── integration.types.ts
│   └── app.ts               # Aplicación principal
├── tests/                   # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                    # Documentación
│   ├── api.md
│   └── deployment.md
├── scripts/                 # Scripts de utilidad
│   ├── seed.ts
│   └── migrate.ts
├── docker/                  # Configuración Docker
│   ├── Dockerfile
│   └── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 🗄️ Base de Datos

### Esquema Principal

#### Users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Assistants
```sql
CREATE TABLE assistants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- 'auto' | 'ai'
    status VARCHAR(50) DEFAULT 'active', -- 'active' | 'inactive' | 'training'
    auto_response TEXT,
    ai_prompt TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Schedules
```sql
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0-6 (Domingo-Sábado)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Conversations
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    platform VARCHAR(50) NOT NULL, -- 'whatsapp' | 'facebook' | 'instagram' | 'telegram'
    status VARCHAR(50) DEFAULT 'active', -- 'active' | 'pending' | 'resolved' | 'archived'
    priority VARCHAR(50) DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'urgent'
    assigned_assistant_id UUID REFERENCES assistants(id),
    last_message TEXT,
    last_message_time TIMESTAMP,
    unread_count INTEGER DEFAULT 0,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Messages
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender VARCHAR(50) NOT NULL, -- 'user' | 'assistant' | 'agent'
    type VARCHAR(50) DEFAULT 'text', -- 'text' | 'image' | 'file' | 'audio' | 'video'
    status VARCHAR(50) DEFAULT 'sent', -- 'sent' | 'delivered' | 'read' | 'failed'
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Integrations
```sql
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'inactive', -- 'active' | 'inactive' | 'error'
    credentials JSONB NOT NULL,
    webhook_url VARCHAR(500),
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔌 APIs y Endpoints

### Autenticación
```typescript
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
PUT    /api/auth/profile
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### Conversaciones
```typescript
GET    /api/conversations              # Listar conversaciones
GET    /api/conversations/:id          # Obtener conversación
POST   /api/conversations              # Crear conversación
PUT    /api/conversations/:id          # Actualizar conversación
DELETE /api/conversations/:id          # Eliminar conversación
GET    /api/conversations/:id/messages # Obtener mensajes
POST   /api/conversations/:id/messages # Enviar mensaje
PUT    /api/conversations/:id/status   # Cambiar estado
```

### Asistentes
```typescript
GET    /api/assistants                 # Listar asistentes
GET    /api/assistants/:id             # Obtener asistente
POST   /api/assistants                 # Crear asistente
PUT    /api/assistants/:id             # Actualizar asistente
DELETE /api/assistants/:id             # Eliminar asistente
POST   /api/assistants/:id/train       # Entrenar asistente
GET    /api/assistants/:id/schedules   # Obtener horarios
POST   /api/assistants/:id/schedules   # Crear horario
PUT    /api/assistants/:id/schedules/:scheduleId # Actualizar horario
DELETE /api/assistants/:id/schedules/:scheduleId # Eliminar horario
```

### Integraciones
```typescript
GET    /api/integrations               # Listar integraciones
GET    /api/integrations/:id           # Obtener integración
POST   /api/integrations               # Crear integración
PUT    /api/integrations/:id           # Actualizar integración
DELETE /api/integrations/:id           # Eliminar integración
POST   /api/integrations/:id/connect   # Conectar integración
POST   /api/integrations/:id/disconnect # Desconectar integración
GET    /api/integrations/:id/status    # Estado de integración
```

### Webhooks
```typescript
POST   /api/webhooks/whatsapp          # Webhook WhatsApp
POST   /api/webhooks/facebook          # Webhook Facebook
POST   /api/webhooks/instagram         # Webhook Instagram
POST   /api/webhooks/telegram          # Webhook Telegram
```

### Analytics
```typescript
GET    /api/analytics/dashboard        # Dashboard principal
GET    /api/analytics/conversations    # Métricas conversaciones
GET    /api/analytics/assistants       # Métricas asistentes
GET    /api/analytics/response-time    # Tiempo de respuesta
GET    /api/analytics/satisfaction     # Satisfacción del cliente
```

## 🔐 Autenticación y Seguridad

### JWT Configuration
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Configuración JWT
const jwtConfig = {
  secret: process.env.JWT_SECRET,
  expiresIn: '24h',
  refreshExpiresIn: '7d'
};
```

### Middleware de Autenticación
```typescript
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};
```

### Rate Limiting
```typescript
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: 'Demasiadas solicitudes desde esta IP'
});
```

## 🔗 Integraciones

### WhatsApp Business API
```typescript
class WhatsAppService {
  async sendMessage(phoneNumber: string, message: string) {
    const response = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      })
    });
    return response.json();
  }
}
```

### OpenAI Integration
```typescript
class AIService {
  async generateResponse(prompt: string, context: string) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: context },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    return response.choices[0].message.content;
  }
}
```

## ⚙️ Configuración

### Variables de Entorno (.env)
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/flame_assistant
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# AI Services
OPENAI_API_KEY=your-openai-api-key

# WhatsApp
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_ID=your-phone-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token

# Facebook
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_ACCESS_TOKEN=your-facebook-token

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/flame_assistant
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=flame_assistant
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

## 🚀 Despliegue

### 1. Preparación del Servidor
```bash
# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Instalar Redis
sudo apt-get install redis-server

# Instalar PM2
sudo npm install -g pm2
```

### 2. Configuración de la Base de Datos
```bash
# Crear usuario y base de datos
sudo -u postgres psql
CREATE USER flame_user WITH PASSWORD 'secure_password';
CREATE DATABASE flame_assistant OWNER flame_user;
GRANT ALL PRIVILEGES ON DATABASE flame_assistant TO flame_user;
\q
```

### 3. Despliegue de la Aplicación
```bash
# Clonar repositorio
git clone https://github.com/your-username/flame-assistant-backend.git
cd flame-assistant-backend

# Instalar dependencias
npm install

# Ejecutar migraciones
npm run migrate

# Compilar TypeScript
npm run build

# Iniciar con PM2
pm2 start dist/app.js --name "flame-backend"
pm2 save
pm2 startup
```

### 4. Configuración de Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🧪 Testing

### Configuración de Tests
```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/app.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};
```

### Scripts de Testing
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "jest --config jest.e2e.config.js"
  }
}
```

## 📊 Monitoreo

### Health Checks
```typescript
app.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: process.memoryUsage()
  };
  res.json(health);
});
```

### Logging
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
});
```

## 📝 Comandos Útiles

```bash
# Desarrollo
npm run dev              # Iniciar en modo desarrollo
npm run build            # Compilar TypeScript
npm run start            # Iniciar en producción

# Base de datos
npm run migrate          # Ejecutar migraciones
npm run seed             # Poblar base de datos
npm run rollback         # Revertir migraciones

# Testing
npm run test             # Ejecutar tests
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Tests con cobertura

# Docker
docker-compose up        # Iniciar contenedores
docker-compose down      # Detener contenedores
docker-compose logs      # Ver logs

# PM2
pm2 start app.js         # Iniciar aplicación
pm2 stop app             # Detener aplicación
pm2 restart app          # Reiniciar aplicación
pm2 logs app             # Ver logs
pm2 monit                # Monitor en tiempo real
```

## 🔧 Próximos Pasos

1. **Configurar el entorno de desarrollo**
2. **Implementar la autenticación JWT**
3. **Crear los modelos de base de datos**
4. **Desarrollar los controladores principales**
5. **Implementar las integraciones con APIs externas**
6. **Configurar los webhooks**
7. **Implementar el sistema de IA**
8. **Agregar tests unitarios e integración**
9. **Configurar el despliegue en producción**
10. **Implementar monitoreo y logging**

---

**¡Con esta documentación tienes todo lo necesario para crear un backend robusto y escalable para FLAME Assistant!** 🚀
