#!/bin/bash

echo "🚀 Iniciando Flame Assistant con Docker..."
echo "================================================"

# Verificar que Docker esté funcionando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker no está funcionando. Por favor, inicia Docker Desktop."
    exit 1
fi

# Iniciar todos los servicios
echo "📦 Iniciando servicios..."
docker-compose up -d

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

# Verificar el estado de los servicios
echo "🔍 Verificando estado de los servicios..."
docker-compose ps

echo ""
echo "✅ ¡Flame Assistant está funcionando!"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:3000"
echo "🗄️  Base de datos: localhost:5432"
echo "📦 Redis: localhost:6379"
echo ""
echo "Para detener los servicios, ejecuta: docker-compose down"
echo "Para ver los logs, ejecuta: docker-compose logs -f"