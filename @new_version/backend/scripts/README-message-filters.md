# Filtros de Mensajes de WhatsApp

## Descripción

Se han implementado filtros para evitar que se guarden mensajes de grupos y estados (status) en la base de datos, manteniendo solo las conversaciones individuales relevantes.

## Filtros Implementados

### 1. Filtro de Mensajes de Grupos

**Criterio**: Los mensajes de grupos se identifican por el sufijo `@g.us` en el `chatId`.

**Implementación**:
```typescript
private isGroupMessage(chatId: string): boolean {
  return chatId.includes('@g.us');
}
```

**Mensajes filtrados**:
- Mensajes de cualquier grupo de WhatsApp
- Conversaciones grupales
- Notificaciones de grupos

### 2. Filtro de Mensajes de Estado (Status)

**Criterios**:
- Contenido que comienza con patrones específicos
- Tipos de mensaje específicos
- Contenido que incluye palabras clave de estado

**Implementación**:
```typescript
private isStatusMessage(message: WhatsAppMessage): boolean {
  // Patrones de contenido
  const statusPatterns = [
    /^\[Status\]/i,
    /^\[Estado\]/i,
    /^\[Story\]/i,
    /^\[Historia\]/i,
    /^\[View Once\]/i,
    /^\[Ver una vez\]/i,
    /^\[Ephemeral\]/i,
    /^\[Temporal\]/i,
    /^\[Protocol Update\]/i,
    /^\[Security Update\]/i
  ];

  // Tipos de mensaje
  const statusMessageTypes = [
    'ephemeral',
    'view_once',
    'view_once_image',
    'view_once_video',
    'protocol_update',
    'security_update'
  ];

  return statusPatterns.some(pattern => pattern.test(message.content)) ||
         statusContent.some(status => message.content.includes(status)) ||
         statusMessageTypes.includes(message.messageType);
}
```

**Mensajes filtrados**:
- Estados de WhatsApp (stories)
- Mensajes temporales (ephemeral)
- Mensajes de "ver una vez" (view once)
- Actualizaciones de protocolo
- Actualizaciones de seguridad
- Historias y estados

## Aplicación de Filtros

Los filtros se aplican en el método `handleMessagesUpsert`:

```typescript
private async handleMessagesUpsert(messages: WAMessage[], type: MessageUpsertType, userId: number): Promise<void> {
  for (const message of messages) {
    try {
      const whatsappMessage = this.convertBaileysMessage(message);
      if (whatsappMessage) {
        // Filtrar mensajes de grupos
        if (this.isGroupMessage(whatsappMessage.chatId)) {
          console.log(`🚫 Skipping group message: ${whatsappMessage.chatId}`);
          continue;
        }

        // Filtrar mensajes de estado (status)
        if (this.isStatusMessage(whatsappMessage)) {
          console.log(`🚫 Skipping status message: ${whatsappMessage.content}`);
          continue;
        }

        // Procesar mensaje normal
        await this.saveMessage(whatsappMessage, userId);
        this.emit('message', userId, whatsappMessage);
      }
    } catch (error) {
      console.error(`❌ Error processing message for user ${userId}:`, error);
    }
  }
}
```

## Scripts de Limpieza

### Script de Limpieza de Datos Existentes

**Archivo**: `scripts/clean-group-status-messages.sh`

**Uso**:
```bash
cd backend
./scripts/clean-group-status-messages.sh
```

**Funcionalidades**:
- Identifica mensajes de grupos existentes
- Identifica mensajes de estado existentes
- Elimina mensajes filtrados de la base de datos
- Muestra estadísticas antes y después de la limpieza

**Ejemplo de salida**:
```
🧹 Limpieza de mensajes de grupos y estados
==========================================
📊 Estadísticas antes de la limpieza:
=====================================
Total de mensajes: 150
Mensajes de grupos: 45
Mensajes de estado: 12

🗑️  Eliminando mensajes de grupos y estados...
=============================================
✅ Mensajes de grupos eliminados: 45
✅ Mensajes de estado eliminados: 12

📊 Estadísticas después de la limpieza:
========================================
Total de mensajes restantes: 93
Mensajes de grupos restantes: 0
Mensajes de estado restantes: 0
Total de mensajes eliminados: 57
```

## Beneficios de los Filtros

### 1. **Reducción de Ruido**
- Solo se guardan conversaciones individuales relevantes
- Se eliminan notificaciones de grupos innecesarias
- Se filtran estados temporales que no aportan valor

### 2. **Mejor Rendimiento**
- Menos datos en la base de datos
- Consultas más rápidas
- Menor uso de almacenamiento

### 3. **Privacidad Mejorada**
- No se almacenan estados temporales
- No se guardan conversaciones grupales
- Solo conversaciones directas relevantes

## Configuración

### Habilitar/Deshabilitar Filtros

Para deshabilitar temporalmente los filtros, comenta las líneas correspondientes en `handleMessagesUpsert`:

```typescript
// Filtrar mensajes de grupos
// if (this.isGroupMessage(whatsappMessage.chatId)) {
//   console.log(`🚫 Skipping group message: ${whatsappMessage.chatId}`);
//   continue;
// }

// Filtrar mensajes de estado (status)
// if (this.isStatusMessage(whatsappMessage)) {
//   console.log(`🚫 Skipping status message: ${whatsappMessage.content}`);
//   continue;
// }
```

### Personalizar Filtros

Para agregar nuevos patrones de filtrado, modifica los arrays en los métodos correspondientes:

```typescript
// Agregar nuevos patrones de estado
const statusPatterns = [
  /^\[Status\]/i,
  /^\[Estado\]/i,
  // Agregar nuevos patrones aquí
  /^\[Nuevo Patrón\]/i
];

// Agregar nuevos tipos de mensaje
const statusMessageTypes = [
  'ephemeral',
  'view_once',
  // Agregar nuevos tipos aquí
  'nuevo_tipo'
];
```

## Monitoreo

### Verificar Filtros en Funcionamiento

Los filtros generan logs cuando se aplican:

```
🚫 Skipping group message: 120363123456789@g.us
🚫 Skipping status message: [Status] Mi estado
```

### Estadísticas de Filtrado

Para monitorear la efectividad de los filtros, revisa los logs del servicio:

```bash
# Ver logs del servicio
docker logs whatsapp-backend

# Filtrar solo mensajes de filtrado
docker logs whatsapp-backend | grep "Skipping"
```

## Troubleshooting

### Si los filtros no funcionan:

1. **Verificar logs**: Buscar mensajes de "Skipping" en los logs
2. **Verificar base de datos**: Ejecutar el script de limpieza
3. **Revisar configuración**: Confirmar que los filtros están habilitados

### Si se filtran mensajes importantes:

1. **Revisar patrones**: Verificar que los patrones no sean demasiado amplios
2. **Ajustar filtros**: Modificar los criterios de filtrado
3. **Restaurar datos**: Si es necesario, deshabilitar filtros temporalmente

## Contacto

Para problemas o mejoras en los filtros:
1. Revisar los logs del servicio
2. Verificar la configuración de la base de datos
3. Ejecutar scripts de diagnóstico
