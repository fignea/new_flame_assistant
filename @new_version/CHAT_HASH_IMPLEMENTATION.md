# Implementación de Chat Hashes Únicos

## Resumen

Se ha implementado un sistema de hashes únicos alfanuméricos para los chats de WhatsApp, reemplazando el uso directo de los IDs de WhatsApp (como `5491138208331@s.whatsapp.net`) por hashes únicos similares a los de Google (ej: `H775QsECkPVQL1SEeej127x3jhmdJFcNH775QsECkPVQ`).

## Cambios Implementados

### 1. Backend

#### Nuevos Archivos
- `src/utils/hash.ts` - Funciones para generar hashes únicos
- `scripts/migrate-chat-hashes.sql` - Migración SQL para agregar campos
- `scripts/migrate-chat-hashes.js` - Script de migración de datos
- `scripts/test-chat-hashes.js` - Script de pruebas

#### Archivos Modificados
- `src/controllers/WhatsAppController.ts` - Actualizado para usar chat_hash
- `src/services/WhatsAppService.ts` - Actualizado para generar y usar chat_hash
- `src/config/database.ts` - Agregado campo chat_hash a las tablas

### 2. Frontend

#### Archivos Modificados
- `src/pages/inbox/InboxPage.tsx` - Actualizado para manejar chat_hash
- `src/components/WhatsAppMessageManager.tsx` - Actualizado interfaces
- `src/hooks/useWhatsAppNotifications.ts` - Actualizado interfaces

### 3. Base de Datos

#### Nuevas Columnas
- `contacts.chat_hash` - Hash único para cada contacto
- `messages.chat_hash` - Hash único para cada mensaje

#### Nuevos Índices
- `idx_contacts_chat_hash` - Índice para búsquedas por chat_hash
- `idx_messages_chat_hash` - Índice para búsquedas por chat_hash

## Funcionalidades

### Generación de Hashes
- **Determinístico**: Mismo hash para el mismo whatsapp_id + user_id
- **Alfanumérico**: 44 caracteres usando A-Z, a-z, 0-9
- **Único**: Garantiza unicidad en la base de datos

### Compatibilidad
- **Backward Compatible**: Mantiene whatsapp_id para comunicación con WhatsApp
- **Forward Compatible**: Usa chat_hash como ID principal en el frontend
- **Migración Automática**: Convierte datos existentes automáticamente

## Estructura de Datos

### Antes
```json
{
  "id": "5491138208331@s.whatsapp.net",
  "name": "Juan Pérez",
  "whatsappId": "5491138208331@s.whatsapp.net"
}
```

### Después
```json
{
  "id": "H775QsECkPVQL1SEeej127x3jhmdJFcNH775QsECkPVQ",
  "whatsappId": "5491138208331@s.whatsapp.net",
  "name": "Juan Pérez"
}
```

## URLs Actualizadas

### Antes
```
http://localhost/inbox/whatsapp_5491138208331@s.whatsapp.net
```

### Después
```
http://localhost/inbox/whatsapp_H775QsECkPVQL1SEeej127x3jhmdJFcNH775QsECkPVQ
```

## Beneficios

1. **Seguridad**: Los IDs de WhatsApp no son visibles en las URLs
2. **Privacidad**: Protege la información personal de los contactos
3. **Escalabilidad**: Hashes más cortos y eficientes
4. **Compatibilidad**: Mantiene funcionalidad existente
5. **Unicidad**: Garantiza IDs únicos globalmente

## Migración

La migración se ejecuta automáticamente y:
1. Agrega las columnas necesarias a la base de datos
2. Genera hashes para todos los contactos existentes
3. Actualiza todos los mensajes con sus respectivos chat_hash
4. Verifica la integridad de los datos

## Pruebas

El sistema incluye pruebas automatizadas que verifican:
- Generación correcta de hashes
- Unicidad de los hashes
- Integridad de los datos migrados
- Funcionalidad de búsqueda por chat_hash

## Uso

El sistema funciona transparentemente:
- Los usuarios ven URLs con hashes únicos
- El backend mantiene la compatibilidad con WhatsApp
- Los datos se migran automáticamente
- No se requiere intervención manual
