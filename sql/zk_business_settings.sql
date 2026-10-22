-- Tabela `zk_business_settings`: šema i podaci iz lokalne baze (22.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_business_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_business_settings` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `description` text COLLATE utf8mb4_unicode_ci,
  `address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsapp_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `instagram` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `facebook` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tiktok` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `youtube` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pib` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `registration_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `logo` longtext COLLATE utf8mb4_unicode_ci,
  `theme_primary` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `theme_secondary` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `theme_tertiary` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `booking_confirmation` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `slot_interval_minutes` smallint unsigned NOT NULL DEFAULT '15',
  `booking_lead_minutes` smallint unsigned NOT NULL DEFAULT '60',
  `booking_horizon_days` smallint unsigned NOT NULL DEFAULT '60',
  `allow_guest_booking` tinyint(1) NOT NULL DEFAULT '0',
  `notify_booking_received` tinyint(1) NOT NULL DEFAULT '1',
  `notify_booking_confirmed` tinyint(1) NOT NULL DEFAULT '1',
  `notify_booking_cancelled` tinyint(1) NOT NULL DEFAULT '1',
  `reminder_hours` smallint unsigned NOT NULL DEFAULT '24',
  `notify_admin_new_booking` tinyint(1) NOT NULL DEFAULT '1',
  `booking_min_days_ahead` tinyint unsigned NOT NULL DEFAULT '1',
  `cancellation_days_before` tinyint unsigned NOT NULL DEFAULT '1',
  `bank_account` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payee_name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payee_address` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_code` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '289',
  `online_payment_enabled` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_business_settings` VALUES (1,'Salon Lepota','beauty_salon','Salon u centru grada, radimo od 2015.','Glavna 1','Beograd','+381 60 123 4567',NULL,'zakazivanje@fiskultura.rs',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'#0f766e','#b45309','#7c3aed','manual','2026-10-21 08:59:44','2026-10-22 11:41:24',15,60,60,0,1,1,1,24,1,1,1,NULL,NULL,NULL,'289',0);

SET FOREIGN_KEY_CHECKS=1;
