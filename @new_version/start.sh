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
            echo "  --prod, --production    Iniciar en modo producción"
            echo "  --dev, --development   Iniciar en modo desarrollo (por defecto)"
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

echo "🚀 Iniciando WhatsApp Manager en modo $ENVIRONMENT..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor instala Docker primero."
    echo "   🔗 https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado. Por favor instala Docker Compose primero."
    echo "   🔗 https://docs.docker.com/compose/install/"
    exit 1
fi

# Verificar que Docker esté ejecutándose
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está ejecutándose. Por favor inicia Docker primero."
    exit 1
fi

echo "✅ Docker está disponible y ejecutándose"

# Crear archivo .env para backend si no existe
if [ ! -f backend/.env ]; then
    echo "📝 Creando archivo .env para backend..."
    cp backend/env.example backend/.env
    echo "✅ Archivo .env creado. Puedes editarlo si necesitas cambiar la configuración."
fi

# Crear directorios para datos persistentes
echo "📁 Creando directorios para datos persistentes..."
mkdir -p docker-data/{backend,sessions,logs}
chmod 755 docker-data/{backend,sessions,logs}
echo "✅ Directorios creados"

# Detener contenedores existentes si están ejecutándose
echo "🛑 Deteniendo contenedores existentes..."
docker-compose -f $COMPOSE_FILE down > /dev/null 2>&1

# Limpiar solo imágenes anteriores (mantener volúmenes)
echo "🧹 Limpiando imágenes anteriores (manteniendo datos)..."
docker-compose -f $COMPOSE_FILE down --rmi all --remove-orphans > /dev/null 2>&1

# Construir contenedores
echo "🔨 Construyendo contenedores..."
echo "   📦 Esto puede tomar varios minutos la primera vez..."
docker-compose -f $COMPOSE_FILE build --no-cache

if [ $? -ne 0 ]; then
    echo "❌ Error construyendo contenedores"
    exit 1
fi

echo "✅ Contenedores construidos exitosamente"

# Iniciar servicios
echo "🚀 Iniciando servicios..."
docker-compose -f $COMPOSE_FILE up -d

if [ $? -ne 0 ]; then
    echo "❌ Error iniciando servicios"
    exit 1
fi

echo "✅ Servicios iniciados"

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén listos..."
echo "   🔄 Backend iniciando..."

# Esperar al backend (hasta 2 minutos)
for i in {1..40}; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "   ✅ Backend listo"
        break
    fi
    if [ $i -eq 40 ]; then
        echo "   ❌ Backend no responde después de 2 minutos"
        echo "   📊 Ver logs: docker-compose -f $COMPOSE_FILE logs backend"
        exit 1
    fi
    sleep 3
    echo "   ⏳ Esperando backend... ($i/40)"
done

echo "   🔄 Frontend iniciando..."

# Esperar al frontend (hasta 1 minuto)
for i in {1..20}; do
    if curl -f http://localhost > /dev/null 2>&1; then
        echo "   ✅ Frontend listo"
        break
    fi
    if [ $i -eq 20 ]; then
        echo "   ❌ Frontend no responde después de 1 minuto"
        echo "   📊 Ver logs: docker-compose -f $COMPOSE_FILE logs frontend"
        exit 1
    fi
    sleep 3
    echo "   ⏳ Esperando frontend... ($i/20)"
done

# Ejecutar migraciones de base de datos
echo "🗄️ Ejecutando migraciones de base de datos..."

# Esperar a que PostgreSQL esté completamente listo
echo "   ⏳ Esperando a que PostgreSQL esté listo..."
for i in {1..20}; do
    if docker-compose -f $COMPOSE_FILE exec postgres pg_isready -U whatsapp_user -d whatsapp_manager > /dev/null 2>&1; then
        echo "   ✅ PostgreSQL listo"
        break
    fi
    if [ $i -eq 20 ]; then
        echo "   ❌ PostgreSQL no responde después de 1 minuto"
        echo "   📊 Ver logs: docker-compose -f $COMPOSE_FILE logs postgres"
        exit 1
    fi
    sleep 3
    echo "   ⏳ Esperando PostgreSQL... ($i/20)"
done

# Ejecutar migración usando el script mejorado
echo "   🔄 Ejecutando migración mejorada..."
docker-compose -f $COMPOSE_FILE exec backend npm run migrate

if [ $? -eq 0 ]; then
    echo "   ✅ Migración completada exitosamente"
else
    echo "   ⚠️  Error en migración automática, intentando migración manual..."
    
    # Fallback: ejecutar migración manual
    echo "   📝 Ejecutando migración manual..."
    docker-compose -f $COMPOSE_FILE exec -T postgres psql -U whatsapp_user -d whatsapp_manager < backend/scripts/init-db.sql
    
    # Verificar que se creó el usuario
    USER_COUNT=$(docker-compose -f $COMPOSE_FILE exec -T postgres psql -U whatsapp_user -d whatsapp_manager -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n')
    
    if [ "$USER_COUNT" -gt "0" ]; then
        echo "   ✅ Usuario por defecto creado exitosamente"
    else
        echo "   ❌ Error al crear usuario por defecto"
        echo "   📊 Ver logs de PostgreSQL:"
        docker-compose -f $COMPOSE_FILE logs postgres | tail -20
        exit 1
    fi
fi

# Mostrar información del usuario por defecto
echo "   👤 Usuario por defecto:"
docker-compose -f $COMPOSE_FILE exec -T postgres psql -U whatsapp_user -d whatsapp_manager -c "SELECT email, name FROM users WHERE email = 'admin@flame.com';" 2>/dev/null || echo "   ⚠️ No se pudo verificar el usuario"

echo "✅ Migraciones de base de datos completadas"

# Verificar estado final de los servicios
echo "🔍 Verificando estado final de los servicios..."

# Verificar backend
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend está funcionando correctamente"
else
    echo "❌ Backend no responde"
fi

# Verificar frontend
if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Frontend está funcionando correctamente"
else
    echo "❌ Frontend no responde"
fi

echo ""
echo "🎉 Flame AI iniciado exitosamente en modo $ENVIRONMENT!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Accede a la aplicación:"
echo "   🌐 Frontend: http://localhost"
echo "   🔧 Backend API: http://localhost:3001"
echo "   🏥 Health Check: http://localhost:3001/health"
echo ""
echo "🔑 Credenciales por defecto:"
echo "   📧 Email: admin@flame.com"
echo "   🔒 Contraseña: flame123"
echo ""
echo "📊 Comandos útiles:"
echo "   📋 Ver logs backend:    docker-compose -f $COMPOSE_FILE logs -f backend"
echo "   📋 Ver logs frontend:   docker-compose -f $COMPOSE_FILE logs -f frontend"
echo "   📋 Ver estado:          docker-compose -f $COMPOSE_FILE ps"
echo "   🛑 Detener servicios:   ./stop.sh"
echo "   🗑️  Limpiar todo:      ./clean.sh"
echo ""
echo "💾 Datos persistentes en: ./docker-data/"
echo "   📊 Base de datos:       ./docker-data/backend/"
echo "   📱 Sesiones WhatsApp:   ./docker-data/sessions/"
echo "   📝 Logs:               ./docker-data/logs/"
echo ""
echo "⚠️  IMPORTANTE: Los datos se mantienen entre reinicios"
echo "   🔄 start/stop: Los datos se conservan"
echo "   🗑️  clean.sh: Solo esto borra los datos permanentemente"
echo ""
echo "🎯 ¡Todo listo! Abre http://localhost en tu navegador"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"docker-compose exec postgres psql -U whatsapp_user -d whatsapp_manager -c "SELECT email, name, LEFT(password, 20) as password_start FROM users;"