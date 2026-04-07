#!/bin/bash

# Reset Password Endpoint
# Reset lozinke koristeći token iz email-a

echo "🔑 Testing Reset Password Endpoint..."
echo ""
echo "⚠️  NAPOMENA: Zameni 'PASTE_RESET_TOKEN_HERE' u reset-password.json sa pravim tokenom!"
echo ""
echo "Request Body:"
cat curl/reset-password.json
echo ""
echo ""

curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d @curl/reset-password.json \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Reset password request completed"
