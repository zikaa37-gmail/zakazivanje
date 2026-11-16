-- Tabela `zk_inbox_notifications`: šema i podaci iz lokalne baze (16.11.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_inbox_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_inbox_notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `kind` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `link` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `appointment_id` bigint unsigned DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_inbox_notifications_appointment_id_foreign` (`appointment_id`),
  KEY `zk_inbox_notifications_user_id_read_at_index` (`user_id`,`read_at`),
  CONSTRAINT `zk_inbox_notifications_appointment_id_foreign` FOREIGN KEY (`appointment_id`) REFERENCES `zk_appointments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `zk_inbox_notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `zk_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_inbox_notifications` VALUES (1,5,'appointment','Novi termin','Petar Petrović · 17.11. u 12:45 · Muško šišanje · Marko','/admin/appointments?date=2026-11-17',1484,'2026-11-16 09:21:28','2026-11-16 09:20:55','2026-11-16 09:21:28'),(2,71,'appointment','Novi termin','Petar Petrović · 17.11. u 12:45 · Muško šišanje · Marko','/admin/appointments?date=2026-11-17',1484,NULL,'2026-11-16 09:20:55','2026-11-16 09:20:55'),(3,73,'appointment','Novi termin','Petar Petrović · 17.11. u 12:45 · Muško šišanje · Marko','/admin/appointments?date=2026-11-17',1484,NULL,'2026-11-16 09:20:55','2026-11-16 09:20:55'),(4,5,'appointment','Novi termin čeka potvrdu','Petar Petrović · 18.11. u 11:15 · Muško šišanje · Jelena','/admin/appointments?date=2026-11-18',1485,'2026-11-16 09:22:39','2026-11-16 09:22:26','2026-11-16 09:22:39'),(5,71,'appointment','Novi termin čeka potvrdu','Petar Petrović · 18.11. u 11:15 · Muško šišanje · Jelena','/admin/appointments?date=2026-11-18',1485,NULL,'2026-11-16 09:22:26','2026-11-16 09:22:26'),(6,71,'appointment','Termin je prebačen: Sandra','Jovana Jovanović · 17.11. u 13:00 · Feniranje · Sandra','/admin/appointments?date=2026-11-17',1467,NULL,'2026-11-16 09:34:50','2026-11-16 09:34:50'),(7,74,'appointment','Termin je prebačen: Sandra','Jovana Jovanović · 17.11. u 13:00 · Feniranje · Sandra','/admin/appointments?date=2026-11-17',1467,NULL,'2026-11-16 09:34:50','2026-11-16 09:34:50');

SET FOREIGN_KEY_CHECKS=1;
