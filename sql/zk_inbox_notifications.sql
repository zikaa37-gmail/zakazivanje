-- Tabela `zk_inbox_notifications`: šema i podaci iz lokalne baze (18.11.2026). Generiše deploy/build-database.py.

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET FOREIGN_KEY_CHECKS=1;
