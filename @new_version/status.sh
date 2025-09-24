#!/bin/bash

echo "📊 Estado de WhatsApp Manager"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar que Docker esté disponible
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está disponible"
    exit 1
fi

echo "🐳 Estado de contenedores:"
docker-compose ps

echo ""
echo "💾 Volúmenes persistentes:"
docker volume ls | grep new_version

echo ""
echo "📁 Datos locales:"
if [ -d "docker-data" ]; then
    echo "   📊 Base de datos: $(du -sh docker-data/backend 2>/dev/null | cut -f1 || echo 'No disponible')"
    echo "   📱 Sesiones: $(du -sh docker-data/sessions 2>/dev/null | cut -f1 || echo 'No disponible')"
    echo "   📝 Logs: $(du -sh docker-data/logs 2>/dev/null | cut -f1 || echo 'No disponible')"
else
    echo "   ❌ Directorio docker-data no existe"
fi

echo ""
echo "🔍 Verificando servicios:"

# Verificar backend
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✅ Backend: http://localhost:3001/health"
else
    echo "   ❌ Backend: No responde"
fi

# Verificar frontend
if curl -f http://localhost > /dev/null 2>&1; then
    echo "   ✅ Frontend: http://localhost"
else
    echo "   ❌ Frontend: No responde"
fi

echo ""
echo "👤 Usuarios en la base de datos:"
docker exec whatsapp-manager-postgres psql -U whatsapp_user -d whatsapp_manager -c "SELECT email, name, created_at FROM users;" 2>/dev/null || echo "   ❌ No se puede acceder a la base de datos"

echo ""
echo "📱 Mensajes recientes:"
docker exec whatsapp-manager-postgres psql -U whatsapp_user -d whatsapp_manager -c "SELECT chat_id, content, is_from_me, timestamp FROM messages ORDER BY timestamp DESC LIMIT 3;" 2>/dev/null || echo "   ❌ No se puede acceder a la base de datos"

echo ""
echo "📊 Comandos disponibles:"
echo "   🚀 Iniciar:     ./start.sh"
echo "   🛑 Detener:     ./stop.sh"
echo "   🗑️  Limpiar:    ./clean.sh"
echo "   📋 Logs:       docker-compose logs -f"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
