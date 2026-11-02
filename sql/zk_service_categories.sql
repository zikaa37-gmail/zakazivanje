-- Tabela `zk_service_categories`: šema i podaci iz lokalne baze (02.11.2026). Generiše deploy/build-database.py.

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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_service_categories` VALUES (1,'Šišanje',0,1,'2026-11-02 10:41:26','2026-11-02 10:41:26'),(2,'Stilizovanje',1,1,'2026-11-02 10:41:26','2026-11-02 10:41:26'),(3,'Boja',2,1,'2026-11-02 10:41:26','2026-11-02 10:41:26'),(4,'Nokti',3,1,'2026-11-02 10:41:26','2026-11-02 10:41:26');

SET FOREIGN_KEY_CHECKS=1;
