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
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_staff_working_hours` VALUES (13,1,1,0,'09:00:00','17:00:00','2026-11-17 13:51:29','2026-11-17 13:51:29'),(14,1,2,0,'09:00:00','17:00:00','2026-11-17 13:51:29','2026-11-17 13:51:29'),(15,1,3,0,'09:00:00','17:00:00','2026-11-17 13:51:29','2026-11-17 13:51:29'),(16,1,4,0,'09:00:00','17:00:00','2026-11-17 13:51:29','2026-11-17 13:51:29'),(17,1,5,0,'09:00:00','17:00:00','2026-11-17 13:51:29','2026-11-17 13:51:29'),(18,1,6,0,'09:00:00','14:00:00','2026-11-17 13:51:29','2026-11-17 13:51:29'),(19,2,1,0,'14:00:00','20:00:00','2026-11-17 13:52:04','2026-11-17 13:52:04'),(20,2,2,0,'14:00:00','20:00:00','2026-11-17 13:52:04','2026-11-17 13:52:04'),(21,2,3,0,'14:00:00','20:00:00','2026-11-17 13:52:04','2026-11-17 13:52:04'),(22,2,4,0,'14:00:00','20:00:00','2026-11-17 13:52:04','2026-11-17 13:52:04'),(23,2,5,0,'14:00:00','20:00:00','2026-11-17 13:52:04','2026-11-17 13:52:04'),(24,2,6,0,'09:00:00','14:00:00','2026-11-17 13:52:04','2026-11-17 13:52:04');

SET FOREIGN_KEY_CHECKS=1;
