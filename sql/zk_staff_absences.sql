-- Tabela `zk_staff_absences`: šema i podaci iz lokalne baze (14.11.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_staff_absences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_staff_absences` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_member_id` bigint unsigned NOT NULL,
  `starts_on` date NOT NULL,
  `ends_on` date NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'sick',
  `note` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `requested_by` bigint unsigned DEFAULT NULL,
  `decided_by` bigint unsigned DEFAULT NULL,
  `decided_at` timestamp NULL DEFAULT NULL,
  `blocked_time_id` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_staff_absences_staff_member_id_foreign` (`staff_member_id`),
  KEY `zk_staff_absences_requested_by_foreign` (`requested_by`),
  KEY `zk_staff_absences_decided_by_foreign` (`decided_by`),
  KEY `zk_staff_absences_blocked_time_id_foreign` (`blocked_time_id`),
  KEY `zk_staff_absences_status_starts_on_index` (`status`,`starts_on`),
  CONSTRAINT `zk_staff_absences_blocked_time_id_foreign` FOREIGN KEY (`blocked_time_id`) REFERENCES `zk_blocked_times` (`id`) ON DELETE SET NULL,
  CONSTRAINT `zk_staff_absences_decided_by_foreign` FOREIGN KEY (`decided_by`) REFERENCES `zk_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `zk_staff_absences_requested_by_foreign` FOREIGN KEY (`requested_by`) REFERENCES `zk_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `zk_staff_absences_staff_member_id_foreign` FOREIGN KEY (`staff_member_id`) REFERENCES `zk_staff_members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET FOREIGN_KEY_CHECKS=1;
