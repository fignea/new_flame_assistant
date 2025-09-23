# Gestión de Mensajes WhatsApp

## Descripción

Sistema completo de gestión de mensajes de WhatsApp integrado directamente con Baileys, que permite enviar, recibir y gestionar conversaciones de WhatsApp desde la plataforma FlameAI.

## Características Principales

### 🔄 Gestión de Sesiones
- **Conexión persistente**: Mantiene sesiones activas de WhatsApp Web
- **Autenticación QR**: Generación automática de códigos QR para vincular dispositivos
- **Reconexión automática**: Recuperación automática de conexiones perdidas
- **Múltiples usuarios**: Soporte para múltiples sesiones simultáneas

### 💬 Gestión de Mensajes
- **Envío de mensajes**: Texto, imágenes, videos, audios, documentos
- **Recepción en tiempo real**: Procesamiento automático de mensajes entrantes
- **Historial de conversaciones**: Almacenamiento y recuperación de mensajes
- **Estados de mensaje**: Seguimiento de envío, entrega y lectura
- **Búsqueda**: Búsqueda avanzada en mensajes y conversaciones

### 📱 Interfaz de Usuario
- **Gestor de mensajes**: Interfaz completa tipo WhatsApp Web
- **Lista de chats**: Visualización de todas las conversaciones
- **Chat individual**: Vista detallada de cada conversación
- **Envío de archivos**: Drag & drop para archivos multimedia
- **Notificaciones**: Alertas en tiempo real de nuevos mensajes

## Arquitectura Técnica

### Backend

#### Servicios
- **WhatsAppMessageService**: Servicio principal para gestión de mensajes
- **WhatsAppSimpleService**: Servicio de conexión básica (legacy)
- **IntegrationController**: Controlador para endpoints de integración
- **MessagesController**: Controlador específico para gestión de mensajes

#### Endpoints API

##### Gestión de Sesiones
```
POST /api/integrations/whatsapp/session
GET  /api/integrations/whatsapp/qr
GET  /api/integrations/whatsapp/status
POST /api/integrations/whatsapp/disconnect
```

##### Gestión de Mensajes
```
POST /api/messages/send
POST /api/messages/send-media
GET  /api/messages/chats
GET  /api/messages/chats/:chatId/messages
POST /api/messages/chats/:chatId/mark-read
GET  /api/messages/recent
GET  /api/messages/search
GET  /api/messages/stats
POST /api/messages/webhook
```

### Frontend

#### Componentes
- **WhatsAppMessageManager**: Componente principal de gestión de mensajes
- **IntegrationsPage**: Página de integraciones con botón de gestión
- **ApiService**: Servicio para comunicación con el backend

#### Características de la UI
- **Diseño responsivo**: Adaptable a diferentes tamaños de pantalla
- **Tema oscuro/claro**: Soporte para ambos modos
- **Animaciones**: Transiciones suaves y feedback visual
- **Accesibilidad**: Navegación por teclado y lectores de pantalla

## Instalación y Configuración

### Dependencias Backend
```json
{
  "@whiskeysockets/baileys": "^6.6.0",
  "qrcode": "^1.5.3",
  "multer": "^1.4.5-lts.1"
}
```

### Dependencias Frontend
```json
{
  "lucide-react": "^0.294.0",
  "react": "^18.2.0",
  "typescript": "^5.0.0"
}
```

### Variables de Entorno
```env
# Backend
WHATSAPP_SESSION_PATH=./sessions
WHATSAPP_BROWSER_NAME=FlameAI
WHATSAPP_BROWSER_VERSION=Chrome/110.0.0.0

# Frontend
VITE_API_BASE_URL=http://localhost:3000/api
```

## Uso

### 1. Conectar WhatsApp
1. Ir a la página de Integraciones
2. Hacer clic en "Conectar" en la tarjeta de WhatsApp Web
3. Escanear el código QR con tu teléfono
4. Esperar confirmación de conexión

### 2. Gestionar Mensajes
1. Una vez conectado, hacer clic en "Gestionar Mensajes"
2. Seleccionar un chat de la lista
3. Enviar mensajes de texto o archivos
4. Ver historial de conversaciones

### 3. Funciones Avanzadas
- **Búsqueda**: Usar la barra de búsqueda para encontrar mensajes
- **Archivos**: Arrastrar y soltar archivos para enviarlos
- **Estados**: Ver el estado de entrega de los mensajes
- **Notificaciones**: Recibir alertas de nuevos mensajes

## Estructura de Datos

### WhatsAppMessage
```typescript
interface WhatsAppMessage {
  id: string;
  key: WAMessageKey;
  message: WAMessageContent;
  messageTimestamp: number;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  fromMe: boolean;
  chatId: string;
  senderId: string;
  senderName?: string;
  body?: string;
  type: string;
  hasMedia: boolean;
  media?: {
    mimetype?: string;
    filename?: string;
    caption?: string;
    url?: string;
  };
  quotedMessage?: WhatsAppMessage;
  contextInfo?: any;
}
```

### WhatsAppChat
```typescript
interface WhatsAppChat {
  id: string;
  name: string;
  isGroup: boolean;
  isReadOnly: boolean;
  unreadCount: number;
  lastMessage?: WhatsAppMessage;
  participants: string[];
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  pinned: boolean;
  ephemeralExpiration?: number;
  ephemeralSettingTimestamp?: number;
}
```

## Eventos en Tiempo Real

### Backend Events
- `qr`: Código QR generado
- `connected`: Conexión establecida
- `disconnected`: Conexión perdida
- `message`: Mensaje recibido
- `messageUpdate`: Estado de mensaje actualizado
- `chat`: Chat actualizado
- `presence`: Estado de presencia actualizado

### Frontend Events
- `onMessageSent`: Mensaje enviado exitosamente
- `onMessageReceived`: Mensaje recibido
- `onConnectionStatusChange`: Cambio en estado de conexión

## Seguridad

### Medidas Implementadas
- **Autenticación JWT**: Todas las rutas requieren autenticación
- **Validación de entrada**: Sanitización de datos de entrada
- **Rate limiting**: Límites de velocidad para prevenir spam
- **Sesiones aisladas**: Cada usuario tiene su propia sesión
- **Limpieza automática**: Limpieza de sesiones inactivas

### Consideraciones
- Los datos de sesión se almacenan localmente
- No se almacenan credenciales en la base de datos
- Las sesiones expiran automáticamente
- Soporte para múltiples dispositivos por usuario

## Monitoreo y Logs

### Métricas Disponibles
- Número de sesiones activas
- Mensajes enviados/recibidos
- Tiempo de respuesta de la API
- Errores de conexión
- Uso de memoria y CPU

### Logs
- Conexiones y desconexiones
- Errores de envío de mensajes
- Eventos de Baileys
- Rendimiento de la aplicación

## Solución de Problemas

### Problemas Comunes

#### QR Code no aparece
- Verificar que la sesión se haya creado correctamente
- Revisar logs del backend para errores
- Intentar crear una nueva sesión

#### Mensajes no se envían
- Verificar estado de conexión
- Revisar formato del número de teléfono
- Comprobar logs de errores

#### Conexión se pierde frecuentemente
- Verificar estabilidad de la red
- Revisar configuración de timeouts
- Comprobar logs de reconexión

### Debug
```bash
# Backend logs
tail -f logs/combined.log

# Verificar sesiones activas
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/messages/stats
```

## Roadmap

### Próximas Características
- [ ] Soporte para grupos
- [ ] Plantillas de mensajes
- [ ] Programación de mensajes
- [ ] Integración con CRM
- [ ] Análisis de conversaciones
- [ ] Bot de respuestas automáticas
- [ ] Exportación de conversaciones
- [ ] API webhooks avanzados

### Mejoras Técnicas
- [ ] Cache Redis para mensajes
- [ ] Compresión de imágenes
- [ ] Soporte para más tipos de archivo
- [ ] Optimización de memoria
- [ ] Clustering de sesiones
- [ ] Métricas avanzadas

## Contribución

### Cómo Contribuir
1. Fork del repositorio
2. Crear rama para feature
3. Implementar cambios
4. Agregar tests
5. Crear pull request

### Estándares de Código
- TypeScript estricto
- ESLint + Prettier
- Tests unitarios
- Documentación JSDoc
- Commits semánticos

## Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

## Soporte

Para soporte técnico o preguntas:
- Crear issue en GitHub
- Contactar al equipo de desarrollo
- Revisar documentación completa

---

**Nota**: Esta funcionalidad requiere una conexión estable a internet y permisos de WhatsApp Web en el dispositivo móvil.
