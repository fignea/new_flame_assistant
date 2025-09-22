#!/bin/bash

echo "🚀 Test WhatsApp Web Simple"
echo "=========================="

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

echo "✅ Token obtenido: ${TOKEN:0:50}..."

# Crear sesión
echo "📱 Creando sesión WhatsApp..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/api/integrations/whatsapp/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN")

echo "Respuesta de sesión:"
echo "$SESSION_RESPONSE" | jq

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.data.sessionId')
echo "Session ID: $SESSION_ID"

# Esperar y obtener QR
echo "🔍 Esperando QR code (esto puede tomar 30-60 segundos)..."
for i in {1..30}; do
  echo "Intento $i/30..."
  
  QR_RESPONSE=$(curl -s -X GET http://localhost:3000/api/integrations/whatsapp/qr \
    -H "Authorization: Bearer $TOKEN")
  
  QR_CODE=$(echo "$QR_RESPONSE" | jq -r '.data.qrCode')
  
  if [ "$QR_CODE" != "null" ] && [ -n "$QR_CODE" ]; then
    echo "✅ QR Code obtenido!"
    echo "Tipo: ${QR_CODE:0:20}..."
    echo "Longitud: ${#QR_CODE} caracteres"
    
    # Guardar QR en archivo
    echo "$QR_CODE" > qr_code.txt
    echo "QR guardado en qr_code.txt"
    
    # Verificar estado
    echo "📊 Verificando estado..."
    STATUS_RESPONSE=$(curl -s -X GET http://localhost:3000/api/integrations/whatsapp/status \
      -H "Authorization: Bearer $TOKEN")
    
    echo "Estado:"
    echo "$STATUS_RESPONSE" | jq
    
    break
  else
    echo "QR no disponible aún, esperando 2 segundos..."
    sleep 2
  fi
done

if [ "$QR_CODE" = "null" ] || [ -z "$QR_CODE" ]; then
  echo "❌ No se pudo obtener QR code después de 60 segundos"
  echo "Respuesta final:"
  echo "$QR_RESPONSE" | jq
fi
