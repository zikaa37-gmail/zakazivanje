-- Tabela `zk_services`: šema i podaci iz lokalne baze (31.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_services` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `audience` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `booking_confirmation` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_minutes` smallint unsigned NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `paused_until` date DEFAULT NULL,
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_services` VALUES (1,'Žensko šišanje',NULL,'Šišanje','female',NULL,45,2500.00,1,NULL,0,'2026-10-21 08:59:46','2026-10-30 21:12:09'),(2,'Muško šišanje',NULL,'Šišanje','male',NULL,30,1500.00,1,NULL,1,'2026-10-21 08:59:46','2026-10-21 08:59:46'),(3,'Feniranje',NULL,'Stilizovanje','all',NULL,30,1200.00,1,NULL,2,'2026-10-21 08:59:46','2026-10-30 21:34:18'),(4,'Farbanje',NULL,'Boja','all',NULL,90,4500.00,1,NULL,3,'2026-10-21 08:59:46','2026-10-21 08:59:46'),(5,'Manikir',NULL,'Nokti','all',NULL,60,2000.00,0,NULL,4,'2026-10-21 08:59:46','2026-10-22 13:01:42');

SET FOREIGN_KEY_CHECKS=1;
