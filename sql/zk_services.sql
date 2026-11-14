-- Tabela `zk_services`: šema i podaci iz lokalne baze (14.11.2026). Generiše deploy/build-database.py.

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
  `service_category_id` bigint unsigned DEFAULT NULL,
  `audience` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `booking_confirmation` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_minutes` smallint unsigned NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `paused_until` date DEFAULT NULL,
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `cancellation_fee_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancellation_fee_value` decimal(10,2) DEFAULT NULL,
  `cancellation_free_late` tinyint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_services_service_category_id_foreign` (`service_category_id`),
  CONSTRAINT `zk_services_service_category_id_foreign` FOREIGN KEY (`service_category_id`) REFERENCES `zk_service_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_services` VALUES (1,'Žensko šišanje',NULL,1,'female',NULL,45,2500.00,1,NULL,0,'2026-10-21 08:59:46','2026-10-30 21:12:09',NULL,NULL,NULL),(2,'Muško šišanje',NULL,1,'male',NULL,30,1500.00,1,NULL,1,'2026-10-21 08:59:46','2026-10-21 08:59:46',NULL,NULL,NULL),(3,'Feniranje',NULL,2,'all',NULL,30,1200.00,1,NULL,2,'2026-10-21 08:59:46','2026-11-14 09:49:32',NULL,NULL,NULL),(4,'Farbanje',NULL,3,'all',NULL,90,4500.00,1,NULL,3,'2026-10-21 08:59:46','2026-10-21 08:59:46',NULL,NULL,NULL),(5,'Manikir',NULL,4,'all',NULL,60,2000.00,0,NULL,4,'2026-10-21 08:59:46','2026-10-22 13:01:42',NULL,NULL,NULL);

SET FOREIGN_KEY_CHECKS=1;
