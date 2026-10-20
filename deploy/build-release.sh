#!/usr/bin/env bash
# Pravi kompletan paket za deploy na cPanel jednom komandom (iz korena repoa):
#
#   bash deploy/build-release.sh              # testovi + backend paket + frontend paket
#   bash deploy/build-release.sh --skip-tests # bez pokretanja backend testova
#
# Rezultat (deploy/, gitignore-ovano):
#   zakazivanje-app.zip   -> ~/zakazivanje_app/                 (Laravel, sa vendor/ bez dev paketa)
#   zakazivanje-web.zip   -> ~/zakazivanje.fiskultura.rs/       (Angular build)
#   zakazivanje-baza.sql  -> phpMyAdmin Import (migracija baze, jedan fajl; sql/zk_*.sql po tabelama)
#
# Ceo postupak (upload, .env, cron, redosled koraka) je u docs/DEPLOY.md.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/backend-production-build"
COMPOSER_PHAR="${COMPOSER_PHAR:-/c/Users/PC/composer/composer.phar}"

if [[ "${1:-}" != "--skip-tests" ]]; then
  echo "==> Backend testovi"
  (cd "$ROOT/backend" && php artisan test)
fi

echo "==> Backend: kopija bez vendor/, .env i testova"
rm -rf "$BUILD"
mkdir -p "$BUILD"
(cd "$ROOT/backend" && tar \
  --exclude='./vendor' --exclude='./node_modules' --exclude='./tests' \
  --exclude='./.env*' --exclude='./.git*' --exclude='./phpunit.xml' \
  --exclude='./storage/logs/*.log' --exclude='./bootstrap/cache/*.php' \
  -cf - .) | (cd "$BUILD" && tar -xf -)

echo "==> Backend: composer install --no-dev"
(cd "$BUILD" && php "$COMPOSER_PHAR" install --no-dev --optimize-autoloader --no-interaction)

# Windows-only .exe fajlovi iz vendor/ (cPanel antivirus ih flaguje pri uploadu, na Linuxu ne trebaju)
find "$BUILD" -iname "*.exe" -delete

echo "==> Frontend: produkcioni build"
(cd "$ROOT/frontend" && npx ng build --configuration production)

echo "==> Baza: migracioni fajl i sql/ po tabelama"
python "$ROOT/deploy/build-database.py"

echo "==> Pakovanje"
python "$ROOT/deploy/make_zip.py" "$BUILD" "$ROOT/deploy/zakazivanje-app.zip"
python "$ROOT/deploy/make_zip.py" "$ROOT/frontend/dist/zakazivanje/browser" "$ROOT/deploy/zakazivanje-web.zip"

echo
echo "Gotovo:"
ls -lh "$ROOT/deploy/zakazivanje-app.zip" "$ROOT/deploy/zakazivanje-web.zip" "$ROOT/deploy/zakazivanje-baza.sql"
