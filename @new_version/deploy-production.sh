#!/bin/bash

# Script de despliegue para producción
set -e

echo "🚀 Iniciando despliegue en producción..."

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: No se encontró docker-compose.yml. Ejecuta este script desde el directorio raíz del proyecto."
    exit 1
fi

# Detener servicios existentes
echo "🛑 Deteniendo servicios existentes..."
docker-compose -f docker-compose.prod.yml down

# Limpiar contenedores y volúmenes si es necesario
if [ "$1" = "--clean" ]; then
    echo "🧹 Limpiando volúmenes y contenedores..."
    docker-compose -f docker-compose.prod.yml down --volumes --remove-orphans
    docker system prune -f
fi

# Reconstruir y iniciar servicios
echo "🔨 Reconstruyendo e iniciando servicios..."
docker-compose -f docker-compose.prod.yml up --build -d

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén listos..."
sleep 30

# Verificar estado de los servicios
echo "🏥 Verificando estado de los servicios..."
docker-compose -f docker-compose.prod.yml ps

# Verificar salud del backend
echo "🔍 Verificando salud del backend..."
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend está funcionando correctamente"
else
    echo "❌ Backend no está respondiendo"
    echo "📋 Logs del backend:"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

# Verificar salud del frontend
echo "🔍 Verificando salud del frontend..."
if curl -f http://localhost/ > /dev/null 2>&1; then
    echo "✅ Frontend está funcionando correctamente"
else
    echo "❌ Frontend no está respondiendo"
    echo "📋 Logs del frontend:"
    docker-compose -f docker-compose.prod.yml logs frontend
    exit 1
fi

echo "✅ Despliegue completado exitosamente!"
echo "🌐 Frontend: http://$(curl -s ifconfig.me)"
echo "🔧 Backend: http://$(curl -s ifconfig.me):3001"
echo "🏥 Health Check: http://$(curl -s ifconfig.me):3001/health"

# Mostrar logs en tiempo real
echo "📋 Mostrando logs en tiempo real (Ctrl+C para salir)..."
docker-compose -f docker-compose.prod.yml logs -f
