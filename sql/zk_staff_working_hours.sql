-- Tabela `zk_staff_working_hours`: šema i podaci iz lokalne baze (20.10.2026). Generiše deploy/build-database.py.

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
  `starts_at` time NOT NULL,
  `ends_at` time NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_staff_working_hours_staff_member_id_weekday_index` (`staff_member_id`,`weekday`),
  CONSTRAINT `zk_staff_working_hours_staff_member_id_foreign` FOREIGN KEY (`staff_member_id`) REFERENCES `zk_staff_members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_staff_working_hours` VALUES (1,1,1,'09:00:00','17:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58'),(2,1,2,'09:00:00','17:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58'),(3,1,3,'09:00:00','17:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58'),(4,1,4,'09:00:00','17:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58'),(5,1,5,'09:00:00','17:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58'),(6,2,2,'10:00:00','18:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58'),(7,2,3,'10:00:00','18:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58'),(8,2,4,'10:00:00','18:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58'),(9,2,5,'10:00:00','18:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58'),(10,2,6,'10:00:00','18:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58'),(11,3,1,'12:00:00','20:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58'),(12,3,2,'12:00:00','20:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58'),(13,3,3,'12:00:00','20:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58'),(14,3,4,'12:00:00','20:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58'),(15,3,5,'12:00:00','20:00:00','2026-10-20 08:15:58','2026-10-20 08:15:58');

SET FOREIGN_KEY_CHECKS=1;
