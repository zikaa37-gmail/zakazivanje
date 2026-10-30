-- Tabela `zk_staff_note_recipients`: šema i podaci iz lokalne baze (30.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_staff_note_recipients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_staff_note_recipients` (
  `staff_note_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`staff_note_id`,`user_id`),
  KEY `zk_staff_note_recipients_user_id_foreign` (`user_id`),
  CONSTRAINT `zk_staff_note_recipients_staff_note_id_foreign` FOREIGN KEY (`staff_note_id`) REFERENCES `zk_staff_notes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_staff_note_recipients_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `zk_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET FOREIGN_KEY_CHECKS=1;
