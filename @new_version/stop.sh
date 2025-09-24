#!/bin/bash

echo "🛑 Deteniendo WhatsApp Manager..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar que Docker esté disponible
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está disponible"
    exit 1
fi

# Mostrar estado actual
echo "📊 Estado actual de los contenedores:"
docker-compose ps

echo ""
echo "🛑 Deteniendo servicios..."

# Detener contenedores
docker-compose down

if [ $? -eq 0 ]; then
    echo "✅ Servicios detenidos exitosamente"
else
    echo "❌ Error deteniendo servicios"
fi

echo ""
echo "📊 Comandos adicionales disponibles:"
echo "   🗑️  Limpiar todo (imágenes + volúmenes): docker-compose down --rmi all --volumes"
echo "   🔄 Reiniciar servicios: ./start.sh"
echo "   📋 Ver logs: docker-compose logs"
echo ""
echo "💾 Los datos persistentes se mantienen en: ./docker-data/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
