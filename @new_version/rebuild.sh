#!/bin/bash

echo "🔨 Rebuild rápido de WhatsApp Manager..."
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

# Verificar estado actual
echo "📊 Estado actual de los contenedores:"
docker-compose ps

echo ""
echo "🔨 Iniciando rebuild rápido..."

# Build del backend
echo "📦 Construyendo backend..."
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error construyendo backend"
    exit 1
fi
cd ..
echo "✅ Backend construido exitosamente"

# Build del frontend
echo "📦 Construyendo frontend..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error construyendo frontend"
    exit 1
fi
cd ..
echo "✅ Frontend construido exitosamente"

# Rebuild de contenedores Docker (sin borrar datos)
echo "🐳 Rebuild de contenedores Docker..."
docker-compose build --no-cache

if [ $? -ne 0 ]; then
    echo "❌ Error construyendo contenedores Docker"
    exit 1
fi

echo "✅ Contenedores Docker construidos exitosamente"

# Reiniciar servicios
echo "🔄 Reiniciando servicios..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Error reiniciando servicios"
    exit 1
fi

echo "✅ Servicios reiniciados"

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén listos..."

# Esperar al backend (hasta 1 minuto)
echo "   🔄 Backend iniciando..."
for i in {1..20}; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "   ✅ Backend listo"
        break
    fi
    if [ $i -eq 20 ]; then
        echo "   ⚠️  Backend tardando en responder (puede estar iniciando)"
        break
    fi
    sleep 3
    echo "   ⏳ Esperando backend... ($i/20)"
done

# Esperar al frontend (hasta 30 segundos)
echo "   🔄 Frontend iniciando..."
for i in {1..10}; do
    if curl -f http://localhost > /dev/null 2>&1; then
        echo "   ✅ Frontend listo"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "   ⚠️  Frontend tardando en responder (puede estar iniciando)"
        break
    fi
    sleep 3
    echo "   ⏳ Esperando frontend... ($i/10)"
done

# Verificar estado final
echo "🔍 Verificando estado final..."

# Verificar backend
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend está funcionando correctamente"
else
    echo "⚠️  Backend no responde (puede estar iniciando)"
fi

# Verificar frontend
if curl -f http://localhost > /dev/null 2>&1; then
    echo "✅ Frontend está funcionando correctamente"
else
    echo "⚠️  Frontend no responde (puede estar iniciando)"
fi

echo ""
echo "🎉 Rebuild completado exitosamente!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Accede a la aplicación:"
echo "   🌐 Frontend: http://localhost"
echo "   🔧 Backend API: http://localhost:3001"
echo "   🏥 Health Check: http://localhost:3001/health"
echo ""
echo "📊 Comandos útiles:"
echo "   📋 Ver logs backend:    docker-compose logs -f backend"
echo "   📋 Ver logs frontend:   docker-compose logs -f frontend"
echo "   📋 Ver estado:          docker-compose ps"
echo "   🛑 Detener servicios:   ./stop.sh"
echo "   🔄 Rebuild completo:    ./start.sh"
echo ""
echo "💾 Los datos persistentes se mantuvieron intactos"
echo "   📊 Base de datos:       ./docker-data/backend/"
echo "   📱 Sesiones WhatsApp:   ./docker-data/sessions/"
echo "   📝 Logs:               ./docker-data/logs/"
echo ""
echo "🎯 ¡Todo listo! Abre http://localhost en tu navegador"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
