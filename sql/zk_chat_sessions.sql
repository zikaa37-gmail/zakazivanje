-- Tabela `zk_chat_sessions`: šema i podaci iz lokalne baze (19.11.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_chat_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_chat_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `appointment_id` bigint unsigned DEFAULT NULL,
  `subject` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `started_by` bigint unsigned DEFAULT NULL,
  `assigned_to` bigint unsigned DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `closed_by` bigint unsigned DEFAULT NULL,
  `last_message_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_chat_sessions_appointment_id_foreign` (`appointment_id`),
  KEY `zk_chat_sessions_started_by_foreign` (`started_by`),
  KEY `zk_chat_sessions_assigned_to_foreign` (`assigned_to`),
  KEY `zk_chat_sessions_closed_by_foreign` (`closed_by`),
  KEY `zk_chat_sessions_client_id_expires_at_index` (`client_id`,`expires_at`),
  CONSTRAINT `zk_chat_sessions_appointment_id_foreign` FOREIGN KEY (`appointment_id`) REFERENCES `zk_appointments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `zk_chat_sessions_assigned_to_foreign` FOREIGN KEY (`assigned_to`) REFERENCES `zk_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `zk_chat_sessions_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `zk_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_chat_sessions_closed_by_foreign` FOREIGN KEY (`closed_by`) REFERENCES `zk_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `zk_chat_sessions_started_by_foreign` FOREIGN KEY (`started_by`) REFERENCES `zk_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_chat_sessions` VALUES (1,3,NULL,NULL,4,4,NULL,'2026-11-18 15:47:39',1,'2026-11-18 11:12:08','2026-11-18 11:02:02','2026-11-18 15:47:39'),(4,3,NULL,'Naplata duga',1,1,NULL,NULL,NULL,'2026-11-18 16:19:07','2026-11-18 16:19:07','2026-11-18 16:19:07');

SET FOREIGN_KEY_CHECKS=1;
