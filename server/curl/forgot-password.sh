#!/bin/bash

# Forgot Password Endpoint
# Zahtev za reset lozinke - šalje email sa reset link-om

echo "📧 Testing Forgot Password Endpoint..."
echo ""
echo "Request Body:"
cat curl/forgot-password.json
echo ""
echo ""

curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d @curl/forgot-password.json \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Forgot password request completed"
echo ""
echo "💡 Proveri konzolu servera ili bazu za reset token"
