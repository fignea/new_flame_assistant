# Corrección de Atribución de Mensajes de WhatsApp

## Problema Identificado

Los mensajes enviados por el usuario aparecen incorrectamente como enviados por otros participantes en el grupo, especialmente cuando se recuperan mensajes al reiniciar el servicio de WhatsApp.

### Síntomas
- Mensajes que enviaste aparecen con el nombre de otro participante del grupo
- El campo `is_from_me` se guarda como `FALSE` cuando debería ser `TRUE`
- Esto ocurre principalmente con mensajes recuperados al reiniciar el servicio

## Causas del Problema

1. **Inconsistencia en nombres de columnas**: El código tenía referencias incorrectas a `message_id` en lugar de `whatsapp_message_id`
2. **Problemas en la recuperación de mensajes**: Al reiniciar el servicio, algunos mensajes se procesan incorrectamente
3. **Falta de validación**: No hay validación adicional para confirmar la atribución correcta

## Soluciones Implementadas

### 1. Corrección de Inconsistencias en el Código

**Archivos modificados:**
- `src/controllers/WhatsAppController.ts`: Corregidas las consultas SQL
- `src/services/WhatsAppService.ts`: Corregido el método `saveMessage`

**Cambios realizados:**
```sql
-- Antes (incorrecto)
SELECT m.message_id FROM messages m

-- Después (correcto)  
SELECT m.whatsapp_message_id FROM messages m
```

### 2. Scripts de Corrección

#### `fix-message-attribution.js`
Script para corregir mensajes específicos que tienen atribución incorrecta.

**Uso:**
```bash
node scripts/fix-message-attribution.js
```

**Funcionalidades:**
- Identifica mensajes problemáticos por contenido específico
- Corrige el campo `is_from_me` de `FALSE` a `TRUE`
- Muestra estadísticas antes y después de la corrección

#### `monitor-message-attribution.js`
Script para monitorear y detectar mensajes con atribución incorrecta.

**Uso:**
```bash
node scripts/monitor-message-attribution.js
```

**Funcionalidades:**
- Analiza mensajes recientes
- Identifica patrones sospechosos
- Muestra estadísticas de atribución
- Sugiere acciones correctivas

## Cómo Usar los Scripts

### 1. Verificar el Estado Actual
```bash
cd backend
node scripts/monitor-message-attribution.js
```

### 2. Corregir Mensajes Específicos
Si el monitor identifica mensajes problemáticos:
```bash
node scripts/fix-message-attribution.js
```

### 3. Verificar la Corrección
```bash
node scripts/monitor-message-attribution.js
```

## Prevención Futura

### 1. Validación Adicional en el Código
Se puede agregar validación adicional en el método `convertBaileysMessage`:

```javascript
// Validación adicional para mensajes del usuario
if (key.fromMe && !message.isFromMe) {
  console.warn('⚠️ Mensaje marcado como del usuario pero isFromMe es false');
  message.isFromMe = true;
}
```

### 2. Logging Mejorado
Agregar más logging para detectar problemas:

```javascript
console.log(`💬 Message attribution: ${whatsappMessage.senderName} | isFromMe: ${whatsappMessage.isFromMe} | fromMe: ${key.fromMe}`);
```

### 3. Monitoreo Continuo
Ejecutar el script de monitoreo periódicamente para detectar problemas temprano.

## Estructura de la Base de Datos

### Tabla `messages`
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    whatsapp_message_id TEXT NOT NULL,  -- ID único del mensaje de WhatsApp
    contact_id INTEGER,
    chat_id TEXT NOT NULL,             -- ID del chat/grupo
    content TEXT NOT NULL,             -- Contenido del mensaje
    message_type TEXT DEFAULT 'text',
    is_from_me BOOLEAN DEFAULT FALSE,  -- TRUE si fue enviado por el usuario
    timestamp DATETIME NOT NULL,
    status TEXT DEFAULT 'pending',
    media_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Troubleshooting

### Si los mensajes siguen apareciendo incorrectamente:

1. **Verificar la conexión de WhatsApp**: Asegúrate de que la sesión esté correctamente autenticada
2. **Revisar los logs**: Buscar errores en el procesamiento de mensajes
3. **Ejecutar el monitor**: Usar el script de monitoreo para identificar patrones
4. **Verificar la base de datos**: Confirmar que los datos se están guardando correctamente

### Comandos de Diagnóstico

```bash
# Verificar mensajes en la base de datos
sqlite3 data/whatsapp_manager.db "SELECT COUNT(*) FROM messages;"

# Ver mensajes recientes
sqlite3 data/whatsapp_manager.db "SELECT content, is_from_me, timestamp FROM messages ORDER BY timestamp DESC LIMIT 10;"

# Verificar mensajes problemáticos
sqlite3 data/whatsapp_manager.db "SELECT content, is_from_me FROM messages WHERE is_from_me = FALSE AND content LIKE '%Vaaaamoooooo%';"
```

## Contacto

Si encuentras problemas adicionales o necesitas ayuda, revisa:
1. Los logs del servicio de WhatsApp
2. La configuración de la base de datos
3. El estado de la conexión de WhatsApp

