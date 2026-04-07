#!/bin/bash

# ============================================
# Script: setup_database.sh
# Description: Automatsko izvršavanje SQL skripti
# Usage: ./setup_database.sh [dev|prod]
# ============================================

# Boje za output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default na dev ako nije specificirano
ENV=${1:-dev}

if [ "$ENV" == "dev" ]; then
    DB_NAME="zakazivanje_dev"
elif [ "$ENV" == "prod" ]; then
    DB_NAME="zakazivanje_prod"
else
    echo -e "${RED}❌ Greška: Nepoznato okruženje '$ENV'${NC}"
    echo "   Koristi: ./setup_database.sh [dev|prod]"
    exit 1
fi

echo -e "${YELLOW}🚀 Postavljanje baze: $DB_NAME${NC}"
echo ""

# Provera da li je MySQL instaliran
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}❌ MySQL nije instaliran ili nije u PATH-u${NC}"
    exit 1
fi

# Pitaj za MySQL credentials
read -p "MySQL username [root]: " MYSQL_USER
MYSQL_USER=${MYSQL_USER:-root}

read -sp "MySQL password: " MYSQL_PASS
echo ""
echo ""

# Test MySQL konekcije
echo -e "${YELLOW}🔍 Testiram konekciju...${NC}"
mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" -e "SELECT 1;" &> /dev/null
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Greška: Ne mogu da se povežem na MySQL${NC}"
    echo "   Proveri username/password"
    exit 1
fi
echo -e "${GREEN}✅ Konekcija uspešna${NC}"
echo ""

# Kreiraj bazu podataka
echo -e "${YELLOW}📦 Kreiram bazu '$DB_NAME'...${NC}"
mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" < 00_create_database.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Baza kreirana${NC}"
else
    echo -e "${RED}❌ Greška pri kreiranju baze${NC}"
    exit 1
fi
echo ""

# Izvrši sve SQL fajlove redom (osim 00_create_database.sql)
echo -e "${YELLOW}📊 Kreiram tabele...${NC}"
for file in $(ls -1 [0-9][0-9]_*.sql | grep -v "00_create_database.sql"); do
    echo -n "   $file ... "
    mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" "$DB_NAME" < "$file"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅${NC}"
    else
        echo -e "${RED}❌ GREŠKA${NC}"
        exit 1
    fi
done

echo ""
echo -e "${GREEN}🎉 Uspešno! Baza '$DB_NAME' je spremna.${NC}"
echo ""

# Prikaži tabele
echo -e "${YELLOW}📋 Kreirane tabele:${NC}"
mysql -u"$MYSQL_USER" -p"$MYSQL_PASS" "$DB_NAME" -e "SHOW TABLES;"

echo ""
echo -e "${GREEN}✨ Gotovo!${NC}"
