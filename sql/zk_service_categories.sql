-- Tabela `zk_service_categories`: šema i podaci iz lokalne baze (25.11.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_service_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_service_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int unsigned NOT NULL DEFAULT '0',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `zk_service_categories_name_unique` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_service_categories` VALUES (1,'Masaže',0,1,'2026-11-17 13:07:44','2026-11-17 13:07:44'),(2,'Depilacija i epilacija',1,1,'2026-11-17 13:07:44','2026-11-17 13:07:44'),(3,'Nokti',2,1,'2026-11-17 13:07:44','2026-11-17 13:07:44'),(4,'Tretmani lica',3,1,'2026-11-17 13:07:44','2026-11-17 13:07:44'),(5,'Telo i aparati',4,1,'2026-11-17 13:07:44','2026-11-17 13:07:44'),(6,'Frizer — šišanje',5,0,'2026-11-17 13:07:44','2026-11-17 13:07:44'),(7,'Frizer — boja',6,0,'2026-11-17 13:07:44','2026-11-17 13:07:44'),(8,'Frizer — stilizovanje i nega',7,0,'2026-11-17 13:07:44','2026-11-17 13:07:44');

SET FOREIGN_KEY_CHECKS=1;
