-- Tabela `zk_waitlist_entries`: šema i podaci iz lokalne baze (28.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_waitlist_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_waitlist_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `staff_member_id` bigint unsigned DEFAULT NULL,
  `date` date NOT NULL,
  `part` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'any',
  `service_ids` json NOT NULL,
  `notified_at` timestamp NULL DEFAULT NULL,
  `fulfilled_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_waitlist_entries_client_id_foreign` (`client_id`),
  KEY `zk_waitlist_entries_staff_member_id_foreign` (`staff_member_id`),
  KEY `zk_waitlist_entries_date_fulfilled_at_index` (`date`,`fulfilled_at`),
  CONSTRAINT `zk_waitlist_entries_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `zk_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_waitlist_entries_staff_member_id_foreign` FOREIGN KEY (`staff_member_id`) REFERENCES `zk_staff_members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET FOREIGN_KEY_CHECKS=1;
