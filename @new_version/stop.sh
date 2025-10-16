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
            COMPOSE_FILE="docker-compose.dev.yml"
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

echo "🛑 Deteniendo Flame Assistant en modo $ENVIRONMENT..."
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

# Detener contenedores
echo "🛑 Deteniendo contenedores..."
docker-compose -f $COMPOSE_FILE down

# Verificar que se detuvieron correctamente
if [ $? -eq 0 ]; then
    echo "✅ Servicios detenidos correctamente"
else
    echo "❌ Error al detener los servicios"
    exit 1
fi

echo ""
echo "📊 Estado de los servicios:"
docker-compose -f $COMPOSE_FILE ps
echo ""
echo "🔄 Para reiniciar los servicios:"
echo "   ./start.sh --$ENVIRONMENT"
echo ""
echo "🧹 Para limpiar completamente (eliminar datos):"
echo "   ./clean.sh --$ENVIRONMENT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"