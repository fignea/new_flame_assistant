#!/bin/bash

# Script para limpiar mensajes de status de la base de datos
# Este script elimina mensajes que contienen contenido de status

echo "🧹 Limpieza de mensajes de status"
echo "================================="

# Verificar si existe la base de datos
DB_PATH="data/whatsapp_manager.db"
if [ ! -f "$DB_PATH" ]; then
    echo "❌ No se encontró la base de datos en $DB_PATH"
    exit 1
fi

echo "📊 Estadísticas antes de la limpieza:"
echo "===================================="

# Obtener estadísticas antes de la limpieza
TOTAL_BEFORE=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM messages;")
STATUS_MESSAGES=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM messages WHERE content LIKE '%[Status]%' OR content LIKE '%[Estado]%' OR content LIKE '%[Story]%' OR content LIKE '%[Historia]%' OR content LIKE '%[View Once]%' OR content LIKE '%[Ver una vez]%' OR content LIKE '%[Ephemeral]%' OR content LIKE '%[Temporal]%' OR content LIKE '%[Protocol Update]%' OR content LIKE '%[Security Update]%';")

echo "Total de mensajes: $TOTAL_BEFORE"
echo "Mensajes de status: $STATUS_MESSAGES"

if [ "$TOTAL_BEFORE" -eq 0 ]; then
    echo "✅ No hay mensajes en la base de datos. No hay nada que limpiar."
    exit 0
fi

echo ""
echo "🔍 Identificando mensajes de status a eliminar:"
echo "============================================="

# Mostrar algunos ejemplos de mensajes que se van a eliminar
echo "Mensajes de status que se eliminarán:"
sqlite3 "$DB_PATH" "SELECT id, chat_id, content FROM messages WHERE content LIKE '%[Status]%' OR content LIKE '%[Estado]%' OR content LIKE '%[Story]%' OR content LIKE '%[Historia]%' OR content LIKE '%[View Once]%' OR content LIKE '%[Ver una vez]%' OR content LIKE '%[Ephemeral]%' OR content LIKE '%[Temporal]%' OR content LIKE '%[Protocol Update]%' OR content LIKE '%[Security Update]%' LIMIT 10;" | while IFS='|' read -r id chat_id content; do
    echo "  ID: $id | Chat: $chat_id | Contenido: \"$content\""
done

echo ""
echo "🗑️  Eliminando mensajes de status..."
echo "===================================="

# Eliminar mensajes de status
STATUS_DELETED=$(sqlite3 "$DB_PATH" "DELETE FROM messages WHERE content LIKE '%[Status]%' OR content LIKE '%[Estado]%' OR content LIKE '%[Story]%' OR content LIKE '%[Historia]%' OR content LIKE '%[View Once]%' OR content LIKE '%[Ver una vez]%' OR content LIKE '%[Ephemeral]%' OR content LIKE '%[Temporal]%' OR content LIKE '%[Protocol Update]%' OR content LIKE '%[Security Update]%'; SELECT changes();")

echo "✅ Mensajes de status eliminados: $STATUS_DELETED"

echo ""
echo "📊 Estadísticas después de la limpieza:"
echo "======================================="

# Obtener estadísticas después de la limpieza
TOTAL_AFTER=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM messages;")
REMAINING_STATUS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM messages WHERE content LIKE '%[Status]%' OR content LIKE '%[Estado]%' OR content LIKE '%[Story]%' OR content LIKE '%[Historia]%' OR content LIKE '%[View Once]%' OR content LIKE '%[Ver una vez]%' OR content LIKE '%[Ephemeral]%' OR content LIKE '%[Temporal]%' OR content LIKE '%[Protocol Update]%' OR content LIKE '%[Security Update]%';")

echo "Total de mensajes restantes: $TOTAL_AFTER"
echo "Mensajes de status restantes: $REMAINING_STATUS"

TOTAL_DELETED=$((TOTAL_BEFORE - TOTAL_AFTER))
echo "Total de mensajes eliminados: $TOTAL_DELETED"

echo ""
echo "✅ Limpieza completada exitosamente!"
echo "====================================="
echo "Se eliminaron $TOTAL_DELETED mensajes de status."
echo "La base de datos ahora solo contiene mensajes de conversaciones normales."
