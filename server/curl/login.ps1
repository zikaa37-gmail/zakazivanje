# PowerShell Test Script
# Brza autorizacija za Swagger

Write-Host "🔐 Login i dobijanje tokena..." -ForegroundColor Cyan
Write-Host ""

$response = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"email":"test@zakazivanje.com","password":"Test1234"}'

if ($response.success) {
    $token = $response.data.accessToken

    Write-Host "✅ Login uspešan!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Access Token (kopiraj ovo):" -ForegroundColor Yellow
    Write-Host $token
    Write-Host ""
    Write-Host "💡 Za Swagger autorizaciju:" -ForegroundColor Cyan
    Write-Host "   1. Otvori http://localhost:3000/api-docs" -ForegroundColor White
    Write-Host "   2. Klikni 'Authorize' dugme (ikonica katanca)" -ForegroundColor White
    Write-Host "   3. Unesi:" -ForegroundColor White
    Write-Host "      Bearer $token" -ForegroundColor Gray
    Write-Host "   4. Klikni 'Authorize' -> 'Close'" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Za PowerShell komande:" -ForegroundColor Cyan
    Write-Host "   `$token = `"$token`"" -ForegroundColor Gray
    Write-Host "   Invoke-RestMethod -Uri http://localhost:3000/api/endpoint ``" -ForegroundColor Gray
    Write-Host "       -Headers @{Authorization=`"Bearer `$token`"}" -ForegroundColor Gray
    Write-Host ""

    # Automatski kopiraj u clipboard (ako je dostupno)
    try {
        "Bearer $token" | Set-Clipboard
        Write-Host "📋 Token automatski kopiran u clipboard!" -ForegroundColor Green
    } catch {
        # Ignore if clipboard not available
    }
} else {
    Write-Host "❌ Login neuspešan!" -ForegroundColor Red
    Write-Host $response
}
