# ============================================
# Script: setup_database.ps1
# Description: Automatsko izvršavanje SQL skripti (PowerShell)
# Usage: .\setup_database.ps1 -Env dev
#        .\setup_database.ps1 -Env prod
# ============================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('dev','prod')]
    [string]$Env = 'dev'
)

# Boje
$Red = [ConsoleColor]::Red
$Green = [ConsoleColor]::Green
$Yellow = [ConsoleColor]::Yellow

# Postavi ime baze
if ($Env -eq 'dev') {
    $DbName = 'zakazivanje_dev'
} else {
    $DbName = 'zakazivanje_prod'
}

Write-Host "🚀 Postavljanje baze: $DbName" -ForegroundColor $Yellow
Write-Host ""

# Proveri MySQL
$mysqlPath = Get-Command mysql -ErrorAction SilentlyContinue
if (-not $mysqlPath) {
    Write-Host "❌ MySQL nije instaliran ili nije u PATH-u" -ForegroundColor $Red
    exit 1
}

# Pitaj za credentials
$MysqlUser = Read-Host "MySQL username [root]"
if ([string]::IsNullOrEmpty($MysqlUser)) {
    $MysqlUser = 'root'
}

$SecurePassword = Read-Host "MySQL password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
$MysqlPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""

# Test konekcije
Write-Host "🔍 Testiram konekciju..." -ForegroundColor $Yellow
$testQuery = "SELECT 1;"
$result = & mysql -u$MysqlUser -p$MysqlPass -e $testQuery 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Greška: Ne mogu da se povežem na MySQL" -ForegroundColor $Red
    Write-Host "   Proveri username/password"
    exit 1
}
Write-Host "✅ Konekcija uspešna" -ForegroundColor $Green
Write-Host ""

# Kreiraj bazu
Write-Host "📦 Kreiram bazu '$DbName'..." -ForegroundColor $Yellow
Get-Content "00_create_database.sql" | & mysql -u$MysqlUser -p$MysqlPass 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Baza kreirana" -ForegroundColor $Green
} else {
    Write-Host "❌ Greška pri kreiranju baze" -ForegroundColor $Red
    exit 1
}
Write-Host ""

# Izvrši SQL fajlove
Write-Host "📊 Kreiram tabele..." -ForegroundColor $Yellow
$sqlFiles = Get-ChildItem -Filter "[0-9][0-9]_*.sql" | Where-Object { $_.Name -ne "00_create_database.sql" } | Sort-Object Name

foreach ($file in $sqlFiles) {
    Write-Host "   $($file.Name) ... " -NoNewline
    Get-Content $file.FullName | & mysql -u$MysqlUser -p$MysqlPass $DbName 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅" -ForegroundColor $Green
    } else {
        Write-Host "❌ GREŠKA" -ForegroundColor $Red
        exit 1
    }
}

Write-Host ""
Write-Host "🎉 Uspešno! Baza '$DbName' je spremna." -ForegroundColor $Green
Write-Host ""

# Prikaži tabele
Write-Host "📋 Kreirane tabele:" -ForegroundColor $Yellow
& mysql -u$MysqlUser -p$MysqlPass $DbName -e "SHOW TABLES;"

Write-Host ""
Write-Host "✨ Gotovo!" -ForegroundColor $Green
