#!/bin/bash

echo "🧹 Reseteo completo de Flame Assistant..."
echo "================================================"

# Verificar que Docker esté funcionando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker no está funcionando. Por favor, inicia Docker Desktop."
    exit 1
fi

# Detener todos los servicios
echo "🛑 Deteniendo todos los servicios..."
docker-compose down

# Eliminar contenedores, volúmenes y redes
echo "🧹 Eliminando contenedores, volúmenes y redes..."
docker-compose down -v --remove-orphans

# Limpiar imágenes no utilizadas
echo "🗑️  Limpiando imágenes no utilizadas..."
docker system prune -f

# Eliminar volúmenes huérfanos
echo "🗑️  Eliminando volúmenes huérfanos..."
docker volume prune -f

# Reconstruir todo desde cero
echo "🔨 Reconstruyendo todo desde cero..."
docker-compose build --no-cache

# Iniciar servicios
echo "🚀 Iniciando servicios..."
./start.sh
