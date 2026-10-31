-- Tabela `zk_promotions`: šema i podaci iz lokalne baze (31.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_promotions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `discount_percent` decimal(5,2) DEFAULT NULL,
  `discount_amount` decimal(10,2) DEFAULT NULL,
  `package_price` decimal(10,2) DEFAULT NULL,
  `buy_quantity` tinyint unsigned DEFAULT NULL,
  `free_quantity` tinyint unsigned DEFAULT NULL,
  `loyalty_visits` smallint unsigned DEFAULT NULL,
  `starts_on` date DEFAULT NULL,
  `ends_on` date DEFAULT NULL,
  `weekdays` json DEFAULT NULL,
  `max_uses` int unsigned DEFAULT NULL,
  `once_per_client` tinyint(1) NOT NULL DEFAULT '0',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `zk_promotions_code_unique` (`code`),
  KEY `zk_promotions_type_index` (`type`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_promotions` VALUES (1,'Šišanje + feniranje',NULL,'package',NULL,NULL,NULL,3200.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,0,1,'2026-10-21 08:59:47','2026-10-21 08:59:47'),(2,'Srećni utorak −15%',NULL,'discount_percent',NULL,15.00,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'[2]',NULL,0,0,'2026-10-21 08:59:47','2026-10-30 20:52:21'),(3,'Muško šišanje 2+1',NULL,'bundle',NULL,NULL,NULL,NULL,2,1,NULL,NULL,NULL,NULL,NULL,0,1,'2026-10-21 08:59:47','2026-10-21 08:59:47'),(4,'Svaka 10. poseta −50%',NULL,'loyalty',NULL,50.00,NULL,NULL,NULL,NULL,10,NULL,NULL,NULL,NULL,0,0,'2026-10-21 08:59:47','2026-10-30 20:52:28');

SET FOREIGN_KEY_CHECKS=1;
