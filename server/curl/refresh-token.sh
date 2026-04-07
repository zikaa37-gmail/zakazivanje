#!/bin/bash

# Refresh Token Endpoint
# Osvežavanje access tokena koristeći refresh token

echo "🔄 Testing Refresh Token Endpoint..."
echo ""
echo "⚠️  NAPOMENA: Zameni 'PASTE_REFRESH_TOKEN_HERE' u refresh-token.json sa pravim refresh tokenom!"
echo ""
echo "Request Body:"
cat curl/refresh-token.json
echo ""
echo ""

RESPONSE=$(curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d @curl/refresh-token.json \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s)

echo "$RESPONSE"

# Izvuci novi token
ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$ACCESS_TOKEN" ]; then
  echo ""
  echo "✅ Token refreshed successfully!"
  echo ""
  echo "📋 New Access Token:"
  echo "$ACCESS_TOKEN"
fi
