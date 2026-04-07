#!/bin/bash

# Verify Email Endpoint
# Verifikacija email adrese koristeći token iz email-a

echo "✉️  Testing Verify Email Endpoint..."
echo ""
echo "⚠️  NAPOMENA: Zameni 'PASTE_VERIFICATION_TOKEN_HERE' u verify-email.json sa pravim tokenom!"
echo ""
echo "Request Body:"
cat curl/verify-email.json
echo ""
echo ""

curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d @curl/verify-email.json \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Verify email request completed"
