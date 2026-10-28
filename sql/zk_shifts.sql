-- Tabela `zk_shifts`: šema i podaci iz lokalne baze (28.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_shifts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `starts_at` time NOT NULL,
  `ends_at` time NOT NULL,
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_shifts` VALUES (7,'Pre podne','08:00:00','14:00:00',0,'2026-10-22 21:25:13','2026-10-22 21:25:13'),(8,'Popodne','14:00:00','20:00:00',1,'2026-10-22 21:25:13','2026-10-22 21:25:13'),(9,'Ceo dan','08:00:00','20:00:00',2,'2026-10-22 21:25:13','2026-10-22 21:25:13');

SET FOREIGN_KEY_CHECKS=1;
