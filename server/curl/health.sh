#!/bin/bash

# Health Check Endpoint
# Testira da li je server aktivan

echo "🔍 Testing Health Endpoint..."
echo ""

curl -X GET http://localhost:3000/health \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo "✅ Health check completed"
