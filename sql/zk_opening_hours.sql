-- Tabela `zk_opening_hours`: šema i podaci iz lokalne baze (25.11.2026). Generiše deploy/build-database.py.

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
INSERT INTO `zk_opening_hours` VALUES (1,1,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-18 15:32:31'),(2,2,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-18 15:32:31'),(3,3,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-18 15:32:31'),(4,4,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-18 15:32:31'),(5,5,'09:00:00','20:00:00','2026-11-17 13:07:44','2026-11-18 15:32:31'),(6,6,'09:00:00','16:00:00','2026-11-17 13:07:44','2026-11-18 15:32:31'),(7,7,NULL,NULL,'2026-11-17 13:07:44','2026-11-17 13:07:44');

SET FOREIGN_KEY_CHECKS=1;
