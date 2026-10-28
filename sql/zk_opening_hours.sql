-- Tabela `zk_opening_hours`: šema i podaci iz lokalne baze (28.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_opening_hours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_opening_hours` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `weekday` tinyint unsigned NOT NULL,
  `opens_at` time DEFAULT NULL,
  `closes_at` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `zk_opening_hours_weekday_unique` (`weekday`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_opening_hours` VALUES (1,1,'08:00:00','20:00:00','2026-10-22 13:11:50','2026-10-22 21:25:13'),(2,2,'08:00:00','20:00:00','2026-10-22 13:11:50','2026-10-22 21:25:13'),(3,3,'08:00:00','20:00:00','2026-10-22 13:11:50','2026-10-22 21:25:13'),(4,4,'08:00:00','20:00:00','2026-10-22 13:11:50','2026-10-22 21:25:13'),(5,5,'08:00:00','20:00:00','2026-10-22 13:11:50','2026-10-22 21:25:13'),(6,6,'08:00:00','20:00:00','2026-10-22 13:11:50','2026-10-22 21:25:13'),(7,7,NULL,NULL,'2026-10-22 13:11:50','2026-10-22 13:11:50');

SET FOREIGN_KEY_CHECKS=1;
