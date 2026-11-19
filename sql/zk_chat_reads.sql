-- Tabela `zk_chat_reads`: šema i podaci iz lokalne baze (19.11.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_chat_reads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_chat_reads` (
  `chat_session_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `last_read_message_id` bigint unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`chat_session_id`,`user_id`),
  KEY `zk_chat_reads_user_id_foreign` (`user_id`),
  CONSTRAINT `zk_chat_reads_chat_session_id_foreign` FOREIGN KEY (`chat_session_id`) REFERENCES `zk_chat_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_chat_reads_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `zk_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_chat_reads` VALUES (1,1,3),(1,3,3),(1,4,3),(4,1,7);

SET FOREIGN_KEY_CHECKS=1;
