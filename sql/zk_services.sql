-- Tabela `zk_services`: šema i podaci iz lokalne baze (25.11.2026). Generiše deploy/build-database.py.

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
  `processing_after_minutes` smallint unsigned DEFAULT NULL,
  `processing_minutes` smallint unsigned DEFAULT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_services` VALUES (1,'Relaks masaža celog tela',NULL,1,'all',NULL,60,NULL,NULL,1500.00,1,NULL,0,'2026-11-17 13:07:44','2026-11-25 07:45:48',NULL,NULL,NULL),(2,'Masaža leđa',NULL,1,'all',NULL,30,NULL,NULL,2000.00,0,NULL,1,'2026-11-17 13:07:44','2026-11-17 13:17:23',NULL,NULL,NULL),(3,'Anticelulit masaža',NULL,1,'female',NULL,45,NULL,NULL,0.00,0,NULL,2,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(4,'Limfna drenaža',NULL,1,'all',NULL,60,NULL,NULL,0.00,0,NULL,3,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(5,'Depilacija celih nogu',NULL,2,'female',NULL,45,NULL,NULL,2000.00,0,NULL,4,'2026-11-17 13:07:44','2026-11-18 15:49:04',NULL,NULL,NULL),(6,'Depilacija pola nogu',NULL,2,'all',NULL,30,NULL,NULL,0.00,0,NULL,5,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(7,'Depilacija bikini zone',NULL,2,'female',NULL,20,NULL,NULL,0.00,0,NULL,6,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(8,'Depilacija pazuha',NULL,2,'all',NULL,15,NULL,NULL,0.00,0,NULL,7,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(9,'Depilacija ruku',NULL,2,'all',NULL,20,NULL,NULL,0.00,0,NULL,8,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(10,'Depilacija nausnica',NULL,2,'female',NULL,10,NULL,NULL,0.00,0,NULL,9,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(11,'Epilacija (po zoni)',NULL,2,'all',NULL,30,NULL,NULL,0.00,0,NULL,10,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(12,'Manikir',NULL,3,'all',NULL,45,NULL,NULL,0.00,0,NULL,11,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(13,'Trajni lak',NULL,3,'female',NULL,60,NULL,NULL,0.00,0,NULL,12,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(14,'Nadogradnja noktiju',NULL,3,'female',NULL,120,NULL,NULL,0.00,0,NULL,13,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(15,'Korekcija nadogradnje',NULL,3,'female',NULL,90,NULL,NULL,0.00,0,NULL,14,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(16,'Pedikir',NULL,3,'all',NULL,60,NULL,NULL,0.00,0,NULL,15,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(17,'Pedikir sa trajnim lakom',NULL,3,'female',NULL,75,NULL,NULL,0.00,0,NULL,16,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(18,'Higijenski tretman lica',NULL,4,'all',NULL,60,NULL,NULL,0.00,0,NULL,17,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(19,'Profesionalno šminkanje',NULL,4,'female',NULL,45,NULL,NULL,0.00,0,NULL,18,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(20,'Presoterapija',NULL,5,'all',NULL,30,NULL,NULL,0.00,0,NULL,19,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(21,'Elektrostimulacija',NULL,5,'all',NULL,30,NULL,NULL,0.00,0,NULL,20,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(22,'Žensko šišanje',NULL,6,'female',NULL,45,NULL,NULL,0.00,0,NULL,21,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(23,'Muško šišanje',NULL,6,'male',NULL,30,NULL,NULL,0.00,0,NULL,22,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(24,'Farbanje',NULL,7,'all',NULL,120,30,40,0.00,0,NULL,23,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(25,'Pramenovi',NULL,7,'all',NULL,150,NULL,NULL,0.00,0,NULL,24,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(26,'Balayage',NULL,7,'all',NULL,180,NULL,NULL,0.00,0,NULL,25,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(27,'Blajhanje',NULL,7,'all',NULL,150,30,40,0.00,0,NULL,26,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(28,'Feniranje',NULL,8,'all',NULL,30,NULL,NULL,0.00,0,NULL,27,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(29,'Lokne peglom',NULL,8,'female',NULL,45,NULL,NULL,0.00,0,NULL,28,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(30,'Keratinski tretman',NULL,8,'all',NULL,120,NULL,NULL,0.00,0,NULL,29,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL),(31,'Pletenice sa nadogradnjom',NULL,8,'female',NULL,180,NULL,NULL,0.00,0,NULL,30,'2026-11-17 13:07:44','2026-11-17 13:07:44',NULL,NULL,NULL);

SET FOREIGN_KEY_CHECKS=1;
