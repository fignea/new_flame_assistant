#!/bin/bash

echo "🧪 Probando Flame AIcon Docker..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Función para esperar que un servicio esté listo
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=$3
    
    echo "⏳ Esperando $name..."
    
    for i in $(seq 1 $max_attempts); do
        if curl -f "$url" > /dev/null 2>&1; then
            echo "✅ $name está listo"
            return 0
        fi
        sleep 2
        echo "   🔄 Intento $i/$max_attempts..."
    done
    
    echo "❌ $name no respondió después de $max_attempts intentos"
    return 1
}

# Test 1: Verificar que Docker esté disponible
echo "1️⃣ Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker no está ejecutándose"
    exit 1
fi

echo "✅ Docker está disponible"

# Test 2: Iniciar servicios
echo ""
echo "2️⃣ Iniciando servicios con Docker..."
./start.sh

if [ $? -ne 0 ]; then
    echo "❌ Error iniciando servicios"
    exit 1
fi

# Test 3: Verificar health checks
echo ""
echo "3️⃣ Verificando health checks..."

# Esperar backend
if ! wait_for_service "http://localhost:3001/health" "Backend" 30; then
    echo "📊 Logs del backend:"
    docker-compose logs --tail=20 backend
    exit 1
fi

# Esperar frontend
if ! wait_for_service "http://localhost" "Frontend" 20; then
    echo "📊 Logs del frontend:"
    docker-compose logs --tail=20 frontend
    exit 1
fi

# Test 4: Probar API
echo ""
echo "4️⃣ Probando API..."

# Health check
echo "   🏥 Health check..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
if echo "$HEALTH_RESPONSE" | grep -q '"status":"OK"'; then
    echo "   ✅ Health check OK"
else
    echo "   ❌ Health check falló"
    echo "   📊 Respuesta: $HEALTH_RESPONSE"
fi

# Test login
echo "   🔐 Probando login..."
LOGIN_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@flame.com","password":"flame123"}' \
    http://localhost:3001/api/auth/login)

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo "   ✅ Login exitoso"
    
    # Extraer token para pruebas adicionales
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$TOKEN" ]; then
        echo "   🎫 Token obtenido"
        
        # Test crear sesión WhatsApp
        echo "   📱 Probando crear sesión WhatsApp..."
        SESSION_RESPONSE=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $TOKEN" \
            http://localhost:3001/api/whatsapp/session)
        
        if echo "$SESSION_RESPONSE" | grep -q '"success":true'; then
            echo "   ✅ Sesión WhatsApp creada"
        else
            echo "   ❌ Error creando sesión WhatsApp"
            echo "   📊 Respuesta: $SESSION_RESPONSE"
        fi
        
        # Test obtener estado
        echo "   📊 Probando obtener estado WhatsApp..."
        STATUS_RESPONSE=$(curl -s \
            -H "Authorization: Bearer $TOKEN" \
            http://localhost:3001/api/whatsapp/status)
        
        if echo "$STATUS_RESPONSE" | grep -q '"success":true'; then
            echo "   ✅ Estado obtenido"
        else
            echo "   ❌ Error obteniendo estado"
        fi
    fi
else
    echo "   ❌ Login falló"
    echo "   📊 Respuesta: $LOGIN_RESPONSE"
fi

# Test 5: Verificar frontend
echo ""
echo "5️⃣ Verificando frontend..."
FRONTEND_RESPONSE=$(curl -s http://localhost)
if echo "$FRONTEND_RESPONSE" | grep -q "WhatsApp Manager"; then
    echo "✅ Frontend cargando correctamente"
else
    echo "❌ Frontend no está cargando correctamente"
fi

# Test 6: Verificar estado de contenedores
echo ""
echo "6️⃣ Estado de contenedores:"
docker-compose ps

# Test 7: Verificar volúmenes
echo ""
echo "7️⃣ Verificando volúmenes de datos:"
if [ -d "./docker-data" ]; then
    echo "✅ Directorio docker-data existe"
    echo "   📊 Contenido:"
    ls -la ./docker-data/
else
    echo "❌ Directorio docker-data no existe"
fi

# Resumen final
echo ""
echo "🎉 Pruebas completadas!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Servicios disponibles:"
echo "   🌐 Frontend: http://localhost"
echo "   🔧 Backend: http://localhost:3001"
echo "   🏥 Health: http://localhost:3001/health"
echo ""
echo "🔑 Credenciales:"
echo "   📧 Email: admin@flame.com"
echo "   🔒 Password: flame123"
echo ""
echo "📊 Para monitorear:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Para detener:"
echo "   ./stop.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
