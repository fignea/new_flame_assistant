# 🔥 Flame Assistant - Plataforma Multi-Tenant de Mensajería IA

Flame Assistant es una plataforma empresarial de mensajería inteligente que combina WhatsApp, chat web y asistentes de IA en una solución multi-tenant escalable y segura.

## ✨ Características Principales

### 🏢 Multi-Tenancy
- **Aislamiento completo** de datos entre organizaciones
- **Row Level Security (RLS)** para máxima seguridad
- **Gestión de límites** por plan y tenant
- **Configuración independiente** por organización

### 🤖 Asistentes de IA
- **Múltiples proveedores**: OpenAI, Anthropic, modelos locales
- **Respuestas automáticas** inteligentes
- **Plantillas de respuesta** personalizables
- **Asignación automática** a conversaciones
- **Análisis de sentimientos** y contexto

### 📱 Integraciones
- **WhatsApp Business API** con QR y sesiones
- **Chat web** con widget personalizable
- **Facebook Messenger** (próximamente)
- **Instagram** (próximamente)
- **Telegram** (próximamente)

### 💬 Gestión de Conversaciones
- **Unificación** de todas las plataformas
- **Etiquetado** y categorización avanzada
- **Asignación** de agentes y asistentes
- **Historial completo** de interacciones
- **Métricas** y analytics en tiempo real

### 🔒 Seguridad Empresarial
- **Autenticación JWT** con refresh tokens
- **Roles y permisos** granulares
- **Auditoría completa** de acciones
- **Encriptación** de datos sensibles
- **Cumplimiento** GDPR/CCPA

## 🚀 Inicio Rápido

### Prerrequisitos
- Docker y Docker Compose
- Node.js 18+ (para desarrollo)
- PostgreSQL 15+
- Redis 7+

### Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd flame-assistant
```

2. **Configurar variables de entorno**
```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar variables necesarias
nano .env
```

3. **Iniciar en modo desarrollo**
```bash
./start.sh --dev
```

4. **Iniciar en modo producción**
```bash
./start.sh --prod
```

### Acceso Inicial

- **Frontend**: http://localhost:3000 (dev) / http://localhost (prod)
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

**Credenciales por defecto:**
- Email: `admin@flame.com`
- Contraseña: `flame123`
- Organización: (dejar vacío para crear nueva)

## 🏗️ Arquitectura

### Backend (Node.js + TypeScript)
```
src/
├── config/          # Configuración de BD y Redis
├── controllers/     # Controladores de API
├── middleware/      # Middleware de autenticación y validación
├── routes/          # Definición de rutas
├── services/        # Lógica de negocio
├── types/           # Tipos TypeScript
└── utils/           # Utilidades y helpers
```

### Frontend (React + TypeScript)
```
src/
├── components/      # Componentes reutilizables
├── contexts/        # Contextos de React
├── hooks/           # Hooks personalizados
├── pages/           # Páginas de la aplicación
├── services/        # Servicios de API
└── types/           # Tipos TypeScript
```

### Base de Datos (PostgreSQL)
- **15 tablas principales** con RLS habilitado
- **Índices optimizados** para consultas multi-tenant
- **Triggers** para auditoría automática
- **Vistas materializadas** para analytics
- **Particionado** por tenant (futuro)

## 📊 Estructura Multi-Tenant

### Tablas Principales
- `tenants` - Organizaciones/empresas
- `users` - Usuarios con roles y permisos
- `contacts` - Contactos de todas las plataformas
- `conversations` - Conversaciones unificadas
- `messages` - Mensajes con metadatos
- `assistants` - Asistentes de IA
- `response_templates` - Plantillas de respuesta
- `tags` - Sistema de etiquetado
- `audit_logs` - Log de auditoría
- `api_keys` - Claves de API por tenant

### Aislamiento de Datos
- **Row Level Security (RLS)** en todas las tablas
- **Contexto de tenant** automático en consultas
- **Middleware de autenticación** con validación de tenant
- **Políticas de acceso** granulares por rol

## 🔧 Configuración

### Variables de Entorno

#### Desarrollo
```bash
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flame_assistant_dev
DB_USER=flame_user
DB_PASSWORD=flame_password
JWT_SECRET=dev-secret-key
REDIS_URL=redis://localhost:6379
```

#### Producción
```bash
NODE_ENV=production
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret
OPENAI_API_KEY=your-openai-key
CORS_ORIGIN=https://yourdomain.com
API_URL=https://api.yourdomain.com
WS_URL=wss://api.yourdomain.com
```

### Docker Compose

#### Desarrollo (`docker-compose.dev.yml`)
- Hot reload para frontend y backend
- Volúmenes montados para desarrollo
- Puertos expuestos para debugging

#### Producción (`docker-compose.prod.yml`)
- Imágenes optimizadas
- Nginx como reverse proxy
- SSL/TLS configurado
- Recursos limitados

## 📈 Monitoreo y Analytics

### Métricas en Tiempo Real
- **Conversaciones activas** por tenant
- **Tiempo de respuesta** promedio
- **Satisfacción del cliente** (CSAT)
- **Uso de asistentes** y plantillas
- **Rendimiento** del sistema

### Dashboard Multi-Tenant
- **Vista general** por organización
- **Comparativas** entre tenants
- **Alertas** de límites y uso
- **Reportes** personalizables

## 🔐 Seguridad

### Autenticación y Autorización
- **JWT tokens** con expiración configurable
- **Refresh tokens** para renovación automática
- **Roles granulares**: owner, admin, manager, agent, viewer
- **Permisos específicos** por funcionalidad

### Protección de Datos
- **Encriptación** de API keys y credenciales
- **Hashing** seguro de contraseñas (bcrypt)
- **Sanitización** de inputs
- **Rate limiting** por IP y usuario

### Auditoría
- **Log completo** de todas las acciones
- **Trazabilidad** de cambios de datos
- **Retención** configurable de logs
- **Alertas** de seguridad

## 🚀 Despliegue

### Desarrollo Local
```bash
# Iniciar todos los servicios
./start.sh --dev

# Ver logs en tiempo real
docker-compose -f docker-compose.dev.yml logs -f

# Detener servicios
./stop.sh --dev
```

### Producción
```bash
# Configurar variables de entorno
export POSTGRES_PASSWORD="secure-password"
export JWT_SECRET="your-jwt-secret"
export OPENAI_API_KEY="your-openai-key"

# Iniciar en producción
./start.sh --prod

# Verificar estado
docker-compose -f docker-compose.prod.yml ps
```

### Limpieza Completa
```bash
# Eliminar todos los datos (¡CUIDADO!)
./clean.sh --prod
```

## 📚 API Documentation

### Autenticación
```bash
# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password",
  "tenant_slug": "my-company" // opcional
}

# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password",
  "name": "User Name",
  "tenant_slug": "my-company" // opcional
}
```

### Gestión de Conversaciones
```bash
# Listar conversaciones
GET /api/conversations?page=1&limit=20&status=active

# Crear conversación
POST /api/conversations
{
  "contact_id": "uuid",
  "platform": "whatsapp",
  "external_conversation_id": "whatsapp-chat-id"
}

# Enviar mensaje
POST /api/conversations/{id}/messages
{
  "content": "Hola, ¿cómo estás?",
  "message_type": "text"
}
```

### Asistentes de IA
```bash
# Crear asistente
POST /api/assistants
{
  "name": "Asistente de Ventas",
  "description": "Asistente especializado en ventas",
  "ai_provider": "openai",
  "model": "gpt-3.5-turbo",
  "prompt": "Eres un asistente de ventas profesional...",
  "auto_assign": true
}

# Probar asistente
POST /api/assistants/{id}/test
{
  "message": "Hola, quiero información sobre productos"
}
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

- **Documentación**: [Wiki del proyecto]
- **Issues**: [GitHub Issues]
- **Email**: support@flame.com
- **Discord**: [Servidor de la comunidad]

## 🗺️ Roadmap

### Q1 2025
- [ ] Integración con Facebook Messenger
- [ ] Dashboard de analytics avanzado
- [ ] API de webhooks
- [ ] Mobile app (React Native)

### Q2 2025
- [ ] Integración con Instagram
- [ ] Integración con Telegram
- [ ] Marketplace de plantillas
- [ ] Automatización de flujos

### Q3 2025
- [ ] IA de análisis de sentimientos
- [ ] Predicción de intenciones
- [ ] Integración con CRM
- [ ] White-label solution

---

**Desarrollado con ❤️ por el equipo de Fignea SRL**