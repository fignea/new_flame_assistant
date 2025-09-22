#!/bin/bash

echo "🔍 Test QR Generation"
echo "===================="

# Obtener token
echo "🔑 Obteniendo token..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@flame.com","password":"flame123"}' | \
  jq -r '.data.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Error obteniendo token"
  exit 1
fi

echo "✅ Token obtenido"

# Crear sesión
echo "📱 Creando sesión WhatsApp..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/api/integrations/whatsapp/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")

echo "Respuesta de sesión:"
echo "$SESSION_RESPONSE" | jq

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.data.sessionId')
echo "Session ID: $SESSION_ID"

# Esperar un poco para que se inicialice
echo "⏳ Esperando 10 segundos para inicialización..."
sleep 10

# Intentar obtener QR
echo "🔍 Intentando obtener QR code..."
QR_RESPONSE=$(curl -s -X GET http://localhost:3000/api/integrations/whatsapp/qr \
  -H "Authorization: Bearer $TOKEN")

echo "Respuesta de QR:"
echo "$QR_RESPONSE" | jq

QR_CODE=$(echo "$QR_RESPONSE" | jq -r '.data.qrCode')

if [ "$QR_CODE" != "null" ] && [ -n "$QR_CODE" ]; then
  echo "✅ QR Code obtenido!"
  echo "Tipo: ${QR_CODE:0:20}..."
  echo "Longitud: ${#QR_CODE} caracteres"
  
  # Guardar QR en archivo
  echo "$QR_CODE" > qr_code.txt
  echo "QR guardado en qr_code.txt"
else
  echo "❌ QR Code no disponible aún"
fi

# Verificar estado
echo "📊 Verificando estado..."
STATUS_RESPONSE=$(curl -s -X GET http://localhost:3000/api/integrations/whatsapp/status \
  -H "Authorization: Bearer $TOKEN")

echo "Estado:"
echo "$STATUS_RESPONSE" | jq
