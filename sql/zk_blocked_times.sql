-- Tabela `zk_blocked_times`: šema i podaci iz lokalne baze (22.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_blocked_times`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_blocked_times` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_member_id` bigint unsigned DEFAULT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `reason` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_blocked_times_staff_member_id_foreign` (`staff_member_id`),
  KEY `zk_blocked_times_starts_at_ends_at_index` (`starts_at`,`ends_at`),
  CONSTRAINT `zk_blocked_times_staff_member_id_foreign` FOREIGN KEY (`staff_member_id`) REFERENCES `zk_staff_members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET FOREIGN_KEY_CHECKS=1;
