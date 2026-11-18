-- Tabela `zk_staff_note_replies`: šema i podaci iz lokalne baze (18.11.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_staff_note_replies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_staff_note_replies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_note_id` bigint unsigned NOT NULL,
  `author_id` bigint unsigned DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_staff_note_replies_staff_note_id_foreign` (`staff_note_id`),
  KEY `zk_staff_note_replies_author_id_foreign` (`author_id`),
  CONSTRAINT `zk_staff_note_replies_author_id_foreign` FOREIGN KEY (`author_id`) REFERENCES `zk_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `zk_staff_note_replies_staff_note_id_foreign` FOREIGN KEY (`staff_note_id`) REFERENCES `zk_staff_notes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET FOREIGN_KEY_CHECKS=1;
