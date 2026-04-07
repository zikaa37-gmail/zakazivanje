# PowerShell - Create Test Users

Write-Host "👥 Creating Test Users..." -ForegroundColor Cyan
Write-Host ""

# Client
Write-Host "================================================" -ForegroundColor Yellow
Write-Host "  Test Client Account" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

$clientData = @{
    email = "test@zakazivanje.com"
    password = "Test1234"
    firstName = "Test"
    lastName = "Korisnik"
    phone = "+381641234567"
    whatsappNumber = "+381641234567"
    preferredCommunication = "email"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $clientData

    Write-Host "✅ Client account created!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "⚠️  Client account creation:" $_.Exception.Message -ForegroundColor Yellow
}

Write-Host ""
Write-Host ""

# Provider
Write-Host "================================================" -ForegroundColor Yellow
Write-Host "  Test Provider Account" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

$providerData = @{
    email = "provider@zakazivanje.com"
    password = "Provider1234"
    firstName = "Provider"
    lastName = "Test"
    phone = "+381641234568"
    businessName = "Test Salon"
    businessCategory = "salon"
    pib = "123456789"
    businessPhone = "+381111234567"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register/business" `
        -Method Post `
        -ContentType "application/json" `
        -Body $providerData

    Write-Host "✅ Provider account created!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "⚠️  Provider account creation:" $_.Exception.Message -ForegroundColor Yellow
}

Write-Host ""
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ✅ Test Users Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Client Credentials:" -ForegroundColor Cyan
Write-Host "   Email: test@zakazivanje.com"
Write-Host "   Password: Test1234"
Write-Host ""
Write-Host "📋 Provider Credentials:" -ForegroundColor Cyan
Write-Host "   Email: provider@zakazivanje.com"
Write-Host "   Password: Provider1234"
Write-Host ""
Write-Host "💡 Next Step: Run login.ps1 to get access token" -ForegroundColor Yellow
