-- Tabela `zk_staff_working_hours`: šema i podaci iz lokalne baze (22.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_staff_working_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_staff_working_hours` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `staff_member_id` bigint unsigned NOT NULL,
  `weekday` tinyint unsigned NOT NULL,
  `week` tinyint unsigned NOT NULL DEFAULT '0',
  `starts_at` time NOT NULL,
  `ends_at` time NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_staff_working_hours_staff_member_id_weekday_index` (`staff_member_id`,`weekday`),
  CONSTRAINT `zk_staff_working_hours_staff_member_id_foreign` FOREIGN KEY (`staff_member_id`) REFERENCES `zk_staff_members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_staff_working_hours` VALUES (42,1,1,0,'09:00:00','17:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06'),(43,1,2,0,'09:00:00','17:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06'),(44,1,3,0,'09:00:00','17:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06'),(45,1,4,0,'09:00:00','17:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06'),(46,1,5,0,'09:00:00','17:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06'),(47,2,2,0,'10:00:00','18:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06'),(48,2,3,0,'10:00:00','18:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06'),(49,2,4,0,'10:00:00','18:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06'),(50,2,5,0,'10:00:00','18:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06'),(51,2,6,0,'10:00:00','18:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06'),(52,3,1,0,'12:00:00','20:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06'),(53,3,2,0,'12:00:00','20:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06'),(54,3,3,0,'12:00:00','20:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06'),(55,3,4,0,'12:00:00','20:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06'),(56,3,5,0,'12:00:00','20:00:00','2026-10-22 13:18:06','2026-10-22 13:18:06');

SET FOREIGN_KEY_CHECKS=1;
