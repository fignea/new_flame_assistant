#!/bin/bash

echo "🚀 Iniciando Flame Assistant con Docker..."
echo "================================================"

# Verificar que Docker esté funcionando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker no está funcionando. Por favor, inicia Docker Desktop."
    exit 1
fi

# Detener servicios existentes
echo "🛑 Deteniendo servicios existentes..."
docker-compose down

# Limpiar contenedores y volúmenes (opcional, descomentar si necesitas reset completo)
# echo "🧹 Limpiando contenedores y volúmenes..."
# docker-compose down -v
# docker system prune -f

# Reconstruir imágenes
echo "🔨 Reconstruyendo imágenes del backend y frontend..."
docker-compose build --no-cache backend

# Iniciar servicios de base de datos primero
echo "🗄️  Iniciando base de datos y Redis..."
docker-compose up -d postgres redis

# Esperar a que la base de datos esté lista
echo "⏳ Esperando a que la base de datos esté lista..."
sleep 15

# Verificar que PostgreSQL esté funcionando
echo "🔍 Verificando conexión a PostgreSQL..."
until docker-compose exec postgres pg_isready -U flame_user -d flame_assistant; do
    echo "⏳ Esperando a que PostgreSQL esté listo..."
    sleep 2
done

# Iniciar backend
echo "🔧 Iniciando backend..."
docker-compose up -d backend

# Esperar a que el backend esté listo
echo "⏳ Esperando a que el backend esté listo..."
sleep 10

# Ejecutar migraciones
echo "🔄 Ejecutando migraciones de la base de datos..."
docker-compose exec backend npm run migrate

# Iniciar frontend
echo "🌐 Iniciando frontend..."
docker-compose up -d frontend

# Esperar a que todos los servicios estén listos
echo "⏳ Esperando a que todos los servicios estén listos..."
sleep 10

# Verificar el estado de los servicios
echo "🔍 Verificando estado de los servicios..."
docker-compose ps

# Verificar que los servicios estén funcionando
echo "🧪 Verificando conectividad..."

# Verificar backend
if curl -s http://localhost:3000/api/auth/me > /dev/null 2>&1; then
    echo "✅ Backend respondiendo correctamente"
else
    echo "⚠️  Backend no responde, revisar logs con: docker-compose logs backend"
fi

# Verificar frontend
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend respondiendo correctamente"
else
    echo "⚠️  Frontend no responde, revisar logs con: docker-compose logs frontend"
fi

echo ""
echo "🎉 ¡Flame Assistant está funcionando!"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:3000"
echo "🗄️  Base de datos: localhost:5432"
echo "📦 Redis: localhost:6379"
echo ""
echo "👤 Usuario admin: admin@flame.com / flame123"
echo ""
echo "📋 Comandos útiles:"
echo "  - Ver logs: docker-compose logs -f"
echo "  - Detener: docker-compose down"
echo "  - Reiniciar: ./start.sh"
echo "  - Estado: docker-compose ps"