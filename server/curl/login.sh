#!/bin/bash

# Login Endpoint
# Autentifikacija korisnika i vraćanje JWT tokena

echo "🔐 Testing Login Endpoint..."
echo ""
echo "Request Body:"
cat curl/login.json
echo ""
echo ""

RESPONSE=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d @curl/login.json \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s)

echo "$RESPONSE"

# Izvuci token ako je uspešan login
ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$ACCESS_TOKEN" ]; then
  echo ""
  echo "✅ Login successful!"
  echo ""
  echo "📋 Access Token (kopiraj ovo):"
  echo "$ACCESS_TOKEN"
  echo ""
  echo "💡 Za Swagger autorizaciju:"
  echo "   1. Otvori http://localhost:3000/api-docs"
  echo "   2. Klikni 'Authorize' dugme"
  echo "   3. Unesi: Bearer $ACCESS_TOKEN"
  echo ""
  echo "💡 Za curl komande:"
  echo "   export TOKEN=\"$ACCESS_TOKEN\""
  echo "   curl -H \"Authorization: Bearer \$TOKEN\" http://localhost:3000/api/endpoint"
fi
