#!/bin/bash

echo "🔍 Verificando integración de WhatsApp Web..."
echo "================================================"

# Verificar que los servicios estén corriendo
echo "📊 Estado de los servicios:"
docker-compose ps

echo ""
echo "🌐 Verificando frontend..."
curl -s http://localhost:5173/integrations | head -3

echo ""
echo "🔧 Verificando backend..."
curl -s http://localhost:3000/health | jq '.status'

echo ""
echo "🔑 Obteniendo token de autenticación..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@flame.com","password":"flame123"}' | \
  jq -r '.data.accessToken')

if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
  echo "✅ Token obtenido: ${TOKEN:0:50}..."
  
  echo ""
  echo "📱 Probando creación de sesión WhatsApp..."
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/integrations/whatsapp/session \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN")
  
  echo "Respuesta del backend:"
  echo "$RESPONSE" | jq '.success, .message, .data.sessionId'
  
  QR_CODE=$(echo "$RESPONSE" | jq -r '.data.qrCode')
  if [[ "$QR_CODE" == data:image/png* ]]; then
    echo "✅ QR Code real generado por el backend"
    echo "📏 Longitud del QR: ${#QR_CODE} caracteres"
  else
    echo "❌ QR Code no es del tipo esperado"
  fi
else
  echo "❌ No se pudo obtener token de autenticación"
fi

echo ""
echo "🎯 Para probar en el navegador:"
echo "1. Ve a http://localhost:5173/login"
echo "2. Inicia sesión con admin@flame.com / flame123"
echo "3. Ve a http://localhost:5173/integrations"
echo "4. Haz clic en 'Conectar' en WhatsApp Web"
echo "5. Deberías ver el QR code real del backend"
