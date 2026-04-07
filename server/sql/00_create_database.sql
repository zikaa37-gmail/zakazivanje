-- ============================================
-- Database Creation Script
-- Platform: Zakazivanje
-- Description: Kreiranje baze podataka sa CHARACTER SET i COLLATION
-- ============================================
-- Kreiranje dev baze
CREATE DATABASE IF NOT EXISTS zakazivanje_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Kreiranje production baze
CREATE DATABASE IF NOT EXISTS zakazivanje_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================
-- Usage Instructions
-- ============================================
-- 
-- Za DEVELOPMENT:
-- mysql -u root -p < 00_create_database.sql
-- mysql -u root -p zakazivanje_dev < 01_users.sql
-- mysql -u root -p zakazivanje_dev < 02_businesses.sql
-- ... (redom izvršiti sve SQL fajlove)
-- 
-- Za PRODUCTION:
-- mysql -u root -p < 00_create_database.sql
-- mysql -u root -p zakazivanje_prod < 01_users.sql
-- mysql -u root -p zakazivanje_prod < 02_businesses.sql
-- ... (redom izvršiti sve SQL fajlove)
-- 
-- ============================================
-- Character Set: utf8mb4
-- ============================================
-- utf8mb4 podržava sve Unicode karaktere uključujući emoji-je
-- Bitno za tekstove na srpskom jeziku (ć, č, š, ž, đ)
-- 
-- ============================================
-- Collation: utf8mb4_unicode_ci
-- ============================================
-- Case-insensitive (CI) poređenje stringova
-- Bolje sortiranje za višejezične tekstove