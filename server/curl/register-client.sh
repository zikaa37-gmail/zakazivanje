#!/bin/bash

# Register Client Endpoint
# Registracija novog korisnika sa ulogom klijenta

echo "📝 Testing Register Client Endpoint..."
echo ""
echo "Request Body:"
cat curl/register-client.json
echo ""
echo ""

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d @curl/register-client.json \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Registration request completed"
echo ""
echo "💡 Next step: Login sa kredencijalima iz register-client.json"
