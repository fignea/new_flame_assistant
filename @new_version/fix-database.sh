#!/bin/bash

# Script para solucionar problemas de migración de base de datos
set -e

echo "🔧 Solucionando problemas de migración de base de datos..."

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: No se encontró docker-compose.prod.yml. Ejecuta este script desde el directorio raíz del proyecto."
    exit 1
fi

# Detener servicios
echo "🛑 Deteniendo servicios..."
docker-compose -f docker-compose.prod.yml down

# Eliminar volumen de PostgreSQL para forzar reinicialización
echo "🧹 Eliminando datos de PostgreSQL para reinicialización..."
docker volume rm new_version_postgres_data 2>/dev/null || echo "Volumen no existía"

# Iniciar solo PostgreSQL
echo "🐘 Iniciando PostgreSQL..."
docker-compose -f docker-compose.prod.yml up postgres -d

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a que PostgreSQL esté listo..."
sleep 30

# Verificar que PostgreSQL esté funcionando
echo "🔍 Verificando estado de PostgreSQL..."
if ! docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U whatsapp_user -d whatsapp_manager; then
    echo "❌ PostgreSQL no está listo. Reintentando..."
    sleep 30
fi

# Verificar si el script de inicialización se ejecutó
echo "🔍 Verificando si la migración se ejecutó..."
USER_COUNT=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U whatsapp_user -d whatsapp_manager -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n' || echo "0")

if [ "$USER_COUNT" = "0" ]; then
    echo "⚠️  La migración no se ejecutó automáticamente. Ejecutando manualmente..."
    
    # Ejecutar script de inicialización manualmente
    echo "📝 Ejecutando script de inicialización..."
    docker-compose -f docker-compose.prod.yml exec -T postgres psql -U whatsapp_user -d whatsapp_manager < backend/scripts/init-db.sql
    
    # Verificar que se creó el usuario
    USER_COUNT=$(docker-compose -f docker-compose.prod.yml exec -T postgres psql -U whatsapp_user -d whatsapp_manager -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' \n')
    
    if [ "$USER_COUNT" -gt "0" ]; then
        echo "✅ Usuario creado exitosamente"
    else
        echo "❌ Error al crear usuario"
        exit 1
    fi
else
    echo "✅ La migración ya se ejecutó correctamente"
fi

# Iniciar todos los servicios
echo "🚀 Iniciando todos los servicios..."
docker-compose -f docker-compose.prod.yml up -d

# Esperar a que todos estén listos
echo "⏳ Esperando a que todos los servicios estén listos..."
sleep 30

# Verificar estado final
echo "🏥 Verificando estado final de los servicios..."
docker-compose -f docker-compose.prod.yml ps

# Verificar que el backend esté funcionando
echo "🔍 Verificando backend..."
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend está funcionando"
else
    echo "❌ Backend no está respondiendo"
    echo "📋 Logs del backend:"
    docker-compose -f docker-compose.prod.yml logs backend
    exit 1
fi

# Verificar que el frontend esté funcionando
echo "🔍 Verificando frontend..."
if curl -f http://localhost/ > /dev/null 2>&1; then
    echo "✅ Frontend está funcionando"
else
    echo "❌ Frontend no está respondiendo"
    echo "📋 Logs del frontend:"
    docker-compose -f docker-compose.prod.yml logs frontend
    exit 1
fi

# Mostrar información del usuario por defecto
echo "👤 Usuario por defecto creado:"
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U whatsapp_user -d whatsapp_manager -c "SELECT email, name FROM users WHERE email = 'admin@flame.com';"

echo "✅ ¡Problema de migración solucionado!"
echo "🌐 Frontend: http://$(curl -s ifconfig.me)"
echo "🔧 Backend: http://$(curl -s ifconfig.me):3001"
echo "👤 Login: admin@flame.com / flame123"
