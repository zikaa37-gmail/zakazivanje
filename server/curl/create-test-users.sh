#!/bin/bash

# Create Test Users
# Kreira test korisnike za development

echo "👥 Creating Test Users..."
echo ""
echo "================================================"
echo "  Test Client Account"
echo "================================================"
echo ""

bash curl/register-client.sh

echo ""
echo ""
echo "================================================"
echo "  Test Provider Account"
echo "================================================"
echo ""

bash curl/register-provider.sh

echo ""
echo ""
echo "================================================"
echo "  ✅ Test Users Created!"
echo "================================================"
echo ""
echo "📋 Client Credentials:"
echo "   Email: test@zakazivanje.com"
echo "   Password: Test1234"
echo ""
echo "📋 Provider Credentials:"
echo "   Email: provider@zakazivanje.com"
echo "   Password: Provider1234"
echo ""
echo "💡 Next Steps:"
echo "   1. Run: bash curl/login.sh"
echo "   2. Copy the access token"
echo "   3. Use it in Swagger (http://localhost:3000/api-docs)"
echo "   4. Click 'Authorize' and paste: Bearer <token>"
echo ""
