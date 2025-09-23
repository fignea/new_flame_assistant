#!/bin/bash

echo "🚀 Iniciando WhatsApp Manager..."
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
docker-compose down > /dev/null 2>&1

# Limpiar imágenes anteriores (opcional)
echo "🧹 Limpiando imágenes anteriores..."
docker-compose down --rmi all --volumes --remove-orphans > /dev/null 2>&1

# Construir contenedores
echo "🔨 Construyendo contenedores..."
echo "   📦 Esto puede tomar varios minutos la primera vez..."
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    echo "❌ Error construyendo contenedores"
    exit 1
fi

echo "✅ Contenedores construidos exitosamente"

# Iniciar servicios
echo "🚀 Iniciando servicios..."
docker-compose up -d

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
        echo "   📊 Ver logs: docker-compose logs backend"
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
        echo "   📊 Ver logs: docker-compose logs frontend"
        exit 1
    fi
    sleep 3
    echo "   ⏳ Esperando frontend... ($i/20)"
done

# Crear usuario por defecto
echo "👤 Creando usuario por defecto..."
docker exec whatsapp-manager-backend node -e "
const { database } = require('./dist/config/database.js');
const bcrypt = require('bcryptjs');

setTimeout(async () => {
  try {
    const email = 'admin@flame.com';
    const password = bcrypt.hashSync('flame123', 10);
    const name = 'Administrator';

    await database.run(
      'INSERT OR REPLACE INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, password, name]
    );
    
    console.log('✅ Usuario por defecto creado');
  } catch (error) {
    console.error('❌ Error creando usuario:', error.message);
  }
}, 3000);
" > /dev/null 2>&1

echo "✅ Usuario por defecto configurado"

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
echo "🎉 WhatsApp Manager iniciado exitosamente!"
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
echo "   📋 Ver logs backend:    docker-compose logs -f backend"
echo "   📋 Ver logs frontend:   docker-compose logs -f frontend"
echo "   📋 Ver estado:          docker-compose ps"
echo "   🛑 Detener servicios:   docker-compose down"
echo "   🗑️  Limpiar todo:        docker-compose down --rmi all --volumes"
echo ""
echo "💾 Datos persistentes en: ./docker-data/"
echo "   📊 Base de datos:       ./docker-data/backend/"
echo "   📱 Sesiones WhatsApp:   ./docker-data/sessions/"
echo "   📝 Logs:               ./docker-data/logs/"
echo ""
echo "🎯 ¡Todo listo! Abre http://localhost en tu navegador"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
