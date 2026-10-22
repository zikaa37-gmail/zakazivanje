-- Tabela `zk_appointments`: šema i podaci iz lokalne baze (22.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_appointments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_appointments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `staff_member_id` bigint unsigned NOT NULL,
  `recurrence_id` bigint unsigned DEFAULT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'online',
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `note` text COLLATE utf8mb4_unicode_ci,
  `admin_note` text COLLATE utf8mb4_unicode_ci,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancelled_by` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `payment_method` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `reminder_sent_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_appointments_recurrence_id_foreign` (`recurrence_id`),
  KEY `zk_appointments_staff_member_id_starts_at_index` (`staff_member_id`,`starts_at`),
  KEY `zk_appointments_client_id_starts_at_index` (`client_id`,`starts_at`),
  KEY `zk_appointments_status_index` (`status`),
  CONSTRAINT `zk_appointments_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `zk_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_appointments_recurrence_id_foreign` FOREIGN KEY (`recurrence_id`) REFERENCES `zk_appointment_recurrences` (`id`) ON DELETE SET NULL,
  CONSTRAINT `zk_appointments_staff_member_id_foreign` FOREIGN KEY (`staff_member_id`) REFERENCES `zk_staff_members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_appointments` VALUES (1,2,1,NULL,'2026-10-21 13:00:00','2026-10-21 13:30:00','confirmed','admin',1500.00,0.00,1500.00,NULL,NULL,'2026-10-21 10:28:54',NULL,NULL,NULL,NULL,'2026-10-21 10:28:54','2026-10-22 11:41:24',NULL),(2,2,1,NULL,'2026-10-26 09:45:00','2026-10-26 10:15:00','pending','online',1200.00,0.00,1200.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-10-21 11:14:22','2026-10-22 11:41:24',NULL);

SET FOREIGN_KEY_CHECKS=1;
