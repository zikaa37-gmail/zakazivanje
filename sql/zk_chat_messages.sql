-- Tabela `zk_chat_messages`: šema i podaci iz lokalne baze (17.11.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_chat_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `chat_session_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `notified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_chat_messages_chat_session_id_foreign` (`chat_session_id`),
  KEY `zk_chat_messages_user_id_foreign` (`user_id`),
  CONSTRAINT `zk_chat_messages_chat_session_id_foreign` FOREIGN KEY (`chat_session_id`) REFERENCES `zk_chat_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_chat_messages_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `zk_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET FOREIGN_KEY_CHECKS=1;
