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

# Ejecutar script de inicio automático
./start.sh
```

**¡Eso es todo!** El script automáticamente:
- ✅ Verifica que Docker esté instalado y ejecutándose
- ✅ Crea los directorios necesarios
- ✅ Construye los contenedores
- ✅ Inicia los servicios
- ✅ Espera a que estén listos
- ✅ Crea el usuario por defecto
- ✅ Verifica que todo funcione

La aplicación estará disponible en:
- **Frontend**: http://localhost
- **Backend**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### Comandos Docker Útiles

```bash
# Iniciar servicios
./start.sh

# Detener servicios
./stop.sh

# Probar todo el sistema
./test-docker.sh

# Ver logs en tiempo real
docker-compose logs -f

# Ver estado de contenedores
docker-compose ps

# Limpiar todo (incluyendo datos)
docker-compose down --rmi all --volumes
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
