-- Tabela `zk_staff_working_hours`: šema i podaci iz lokalne baze (17.11.2026). Generiše deploy/build-database.py.

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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_staff_working_hours` VALUES (1,1,1,1,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-17 13:07:44'),(2,1,2,1,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-17 13:07:44'),(3,1,3,1,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-17 13:07:44'),(4,1,4,1,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-17 13:07:44'),(5,1,5,1,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-17 13:07:44'),(6,1,6,1,'09:00:00','16:00:00','2026-11-17 13:07:44','2026-11-17 13:07:44'),(7,2,1,1,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-17 13:07:44'),(8,2,2,1,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-17 13:07:44'),(9,2,3,1,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-17 13:07:44'),(10,2,4,1,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-17 13:07:44'),(11,2,5,1,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-17 13:07:44'),(12,2,6,1,'09:00:00','16:00:00','2026-11-17 13:07:44','2026-11-17 13:07:44');

SET FOREIGN_KEY_CHECKS=1;
