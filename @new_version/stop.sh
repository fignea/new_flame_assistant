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
            echo "  --prod, --production    Detener en modo producción"
            echo "  --dev, --development   Detener en modo desarrollo (por defecto)"
            echo "  -h, --help             Mostrar esta ayuda"
            echo ""
            echo "Ejemplos:"
            echo "  $0                     # Modo desarrollo"
            echo "  $0 --dev               # Modo desarrollo"
            echo "  $0 --prod              # Modo producción"
            exit 0
            ;;
        *)
            echo "❌ Opción desconocida: $1"
            echo "Usa --help para ver las opciones disponibles"
            exit 1
            ;;
    esac
done

echo "🛑 Deteniendo WhatsApp Manager en modo $ENVIRONMENT..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar que Docker esté disponible
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está disponible"
    exit 1
fi

# Mostrar estado actual
echo "📊 Estado actual de los contenedores:"
docker-compose -f $COMPOSE_FILE ps

echo ""
echo "🛑 Deteniendo servicios..."

# Detener contenedores
docker-compose -f $COMPOSE_FILE down

if [ $? -eq 0 ]; then
    echo "✅ Servicios detenidos exitosamente"
else
    echo "❌ Error deteniendo servicios"
fi

echo ""
echo "📊 Comandos adicionales disponibles:"
echo "   🗑️  Limpiar todo (imágenes + volúmenes): docker-compose -f $COMPOSE_FILE down --rmi all --volumes"
echo "   🔄 Reiniciar servicios: ./start.sh --$ENVIRONMENT"
echo "   📋 Ver logs: docker-compose -f $COMPOSE_FILE logs"
echo ""
echo "💾 Los datos persistentes se mantienen en: ./docker-data/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"