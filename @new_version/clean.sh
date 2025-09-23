#!/bin/bash

echo "🗑️  Limpiando WhatsApp Manager completamente..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado."
    exit 1
fi

# Detener y eliminar contenedores
echo "🛑 Deteniendo contenedores..."
docker-compose down

# Eliminar imágenes, volúmenes y redes
echo "🧹 Eliminando imágenes, volúmenes y redes..."
docker-compose down --rmi all --volumes --remove-orphans

# Limpiar datos locales
echo "📁 Limpiando datos locales..."
if [ -d "docker-data" ]; then
    rm -rf docker-data
    echo "   ✅ Directorio docker-data eliminado"
fi

# Limpiar imágenes huérfanas de Docker
echo "🧹 Limpiando imágenes huérfanas de Docker..."
docker system prune -f

echo ""
echo "✅ Limpieza completa realizada"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Para iniciar nuevamente:"
echo "   ./start.sh"
echo ""
echo "⚠️  NOTA: Todos los datos han sido eliminados permanentemente"
echo "   - Base de datos PostgreSQL"
echo "   - Sesiones de WhatsApp"
echo "   - Logs"
echo "   - Configuraciones"
echo ""
