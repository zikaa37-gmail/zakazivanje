#!/bin/bash

# Register Provider (Business) Endpoint
# Registracija novog provajdera (vlasnika biznisa)

echo "🏢 Testing Register Provider Endpoint..."
echo ""
echo "Request Body:"
cat curl/register-provider.json
echo ""
echo ""

curl -X POST http://localhost:3000/api/auth/register/business \
  -H "Content-Type: application/json" \
  -d @curl/register-provider.json \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Business registration request completed"
echo ""
echo "💡 Next step: Login sa kredencijalima iz register-provider.json"
