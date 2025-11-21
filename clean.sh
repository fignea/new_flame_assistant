#!/bin/bash

# Configuración por defecto
ENVIRONMENT="dev"
COMPOSE_FILE="docker-compose.yml"

# Procesar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --prod|--production)
            ENVIRONMENT="prod"
            COMPOSE_FILE="docker-compose.prod.yml"
            shift
            ;;
        --dev|--development)
            ENVIRONMENT="dev"
            COMPOSE_FILE="docker-compose.yml"
            shift
            ;;
        -h|--help)
            echo "Uso: $0 [OPCIONES]"
            echo ""
            echo "Opciones:"
            echo "  --prod, --production    Limpiar en modo producción"
            echo "  --dev, --development   Limpiar en modo desarrollo (por defecto)"
            echo "  -h, --help             Mostrar esta ayuda"
            echo ""
            echo "Ejemplos:"
            echo "  $0                     # Modo desarrollo"
            echo "  $0 --dev               # Modo desarrollo"
            echo "  $0 --prod              # Modo producción"
            echo ""
            echo "⚠️  ADVERTENCIA: Este comando elimina TODOS los datos permanentemente"
            exit 0
            ;;
        *)
            echo "❌ Opción desconocida: $1"
            echo "Usa --help para ver las opciones disponibles"
            exit 1
            ;;
    esac
done

echo "🗑️  Limpiando Flame AI completamente en modo $ENVIRONMENT..."
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

# Confirmar acción destructiva
echo "⚠️  ADVERTENCIA: Esta acción eliminará TODOS los datos permanentemente:"
echo "   - Base de datos PostgreSQL"
echo "   - Sesiones de WhatsApp"
echo "   - Logs"
echo "   - Configuraciones"
echo "   - Imágenes Docker"
echo ""
read -p "¿Estás seguro de que quieres continuar? (escribe 'SI' para confirmar): " confirm

if [ "$confirm" != "SI" ]; then
    echo "❌ Operación cancelada"
    exit 0
fi

# Detener y eliminar contenedores
echo "🛑 Deteniendo contenedores..."
docker-compose -f $COMPOSE_FILE down

# Eliminar imágenes, volúmenes y redes
echo "🧹 Eliminando imágenes, volúmenes y redes..."
docker-compose -f $COMPOSE_FILE down --rmi all --volumes --remove-orphans

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
echo "   ./start.sh --$ENVIRONMENT"
echo ""
echo "⚠️  NOTA: Todos los datos han sido eliminados permanentemente"
echo "   - Base de datos PostgreSQL"
echo "   - Sesiones de WhatsApp"
echo "   - Logs"
echo "   - Configuraciones"
echo ""