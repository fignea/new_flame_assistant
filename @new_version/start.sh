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
            echo "  --prod, --production    Iniciar en modo producción"
            echo "  --dev, --development   Iniciar en modo desarrollo (por defecto)"
            echo "  -h, --help             Mostrar esta ayuda"
            echo ""
            echo "Ejemplos:"
            echo "  $0                     # Modo desarrollo"
            echo "  $0 --dev               # Modo desarrollo"
            echo "  $0 --prod              # Modo producción"
            echo ""
            echo "Variables de entorno requeridas para producción:"
            echo "  - POSTGRES_PASSWORD"
            echo "  - JWT_SECRET"
            echo "  - OPENAI_API_KEY"
            echo "  - CORS_ORIGIN"
            echo "  - API_URL"
            echo "  - WS_URL"
            exit 0
            ;;
        *)
            echo "❌ Opción desconocida: $1"
            echo "Usa --help para ver las opciones disponibles"
            exit 1
            ;;
    esac
done

echo "🚀 Iniciando Flame Assistant en modo $ENVIRONMENT..."
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

# Verificar variables de entorno para producción
if [ "$ENVIRONMENT" = "prod" ]; then
    echo "🔍 Verificando variables de entorno para producción..."
    
    required_vars=("POSTGRES_PASSWORD" "JWT_SECRET" "OPENAI_API_KEY" "CORS_ORIGIN" "API_URL" "WS_URL")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "❌ Faltan las siguientes variables de entorno requeridas:"
        for var in "${missing_vars[@]}"; do
            echo "   - $var"
        done
        echo ""
        echo "Crea un archivo .env con las variables necesarias o expórtalas en tu shell."
        exit 1
    fi
    
    echo "✅ Todas las variables de entorno están configuradas"
fi

# Crear directorios necesarios
echo "📁 Creando directorios necesarios..."
mkdir -p docker-data/backend/sessions
mkdir -p docker-data/backend/logs
mkdir -p docker-data/backend/uploads
mkdir -p docker-data/postgres
mkdir -p docker-data/redis

# Detener contenedores existentes
echo "🛑 Deteniendo contenedores existentes..."
docker-compose -f $COMPOSE_FILE down

# Construir imágenes
echo "🔨 Construyendo imágenes Docker..."
docker-compose -f $COMPOSE_FILE build --no-cache

# Iniciar servicios
echo "🚀 Iniciando servicios..."
docker-compose -f $COMPOSE_FILE up -d

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

# Verificar estado de los servicios
echo "🔍 Verificando estado de los servicios..."

# Verificar PostgreSQL
echo "📊 Verificando PostgreSQL..."
if docker-compose -f $COMPOSE_FILE exec -T postgres pg_isready -U flame_user -d flame_assistant > /dev/null 2>&1; then
    echo "✅ PostgreSQL está funcionando"
else
    echo "❌ PostgreSQL no está respondiendo"
    echo "📋 Logs de PostgreSQL:"
    docker-compose -f $COMPOSE_FILE logs postgres
    exit 1
fi

# Verificar Redis
echo "🔴 Verificando Redis..."
if docker-compose -f $COMPOSE_FILE exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis está funcionando"
else
    echo "❌ Redis no está respondiendo"
    echo "📋 Logs de Redis:"
    docker-compose -f $COMPOSE_FILE logs redis
    exit 1
fi

# Verificar Backend
echo "🔧 Verificando Backend..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Backend está funcionando"
        break
    else
        attempt=$((attempt + 1))
        echo "⏳ Esperando backend... (intento $attempt/$max_attempts)"
        sleep 2
    fi
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Backend no está respondiendo después de $max_attempts intentos"
    echo "📋 Logs del Backend:"
    docker-compose -f $COMPOSE_FILE logs backend
    exit 1
fi

# Verificar Frontend
echo "🎨 Verificando Frontend..."
if curl -s http://localhost:80 > /dev/null 2>&1 || curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend está funcionando"
else
    echo "❌ Frontend no está respondiendo"
    echo "📋 Logs del Frontend:"
    docker-compose -f $COMPOSE_FILE logs frontend
    exit 1
fi

echo ""
echo "🎉 ¡Flame Assistant iniciado exitosamente!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 URLs de acceso:"
if [ "$ENVIRONMENT" = "prod" ]; then
    echo "   🌐 Frontend: http://localhost"
    echo "   🔧 Backend API: http://localhost:3001"
    echo "   🏥 Health Check: http://localhost:3001/health"
else
    echo "   🌐 Frontend: http://localhost:3000"
    echo "   🔧 Backend API: http://localhost:3001"
    echo "   🏥 Health Check: http://localhost:3001/health"
fi
echo ""
echo "🔑 Credenciales por defecto:"
echo "   📧 Email: admin@flame.com"
echo "   🔐 Contraseña: flame123"
echo "   🏢 Organización: (dejar vacío para crear nueva)"
echo ""
echo "📊 Estado de los servicios:"
docker-compose -f $COMPOSE_FILE ps
echo ""
echo "📋 Para ver logs en tiempo real:"
echo "   docker-compose -f $COMPOSE_FILE logs -f"
echo ""
echo "🛑 Para detener los servicios:"
echo "   ./stop.sh --$ENVIRONMENT"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"