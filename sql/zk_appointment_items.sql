-- Tabela `zk_appointment_items`: šema i podaci iz lokalne baze (21.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_appointment_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_appointment_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `appointment_id` bigint unsigned NOT NULL,
  `service_id` bigint unsigned DEFAULT NULL,
  `promotion_id` bigint unsigned DEFAULT NULL,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `duration_minutes` smallint unsigned NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `discount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `promotion_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_appointment_items_appointment_id_foreign` (`appointment_id`),
  KEY `zk_appointment_items_service_id_foreign` (`service_id`),
  KEY `zk_appointment_items_promotion_id_foreign` (`promotion_id`),
  CONSTRAINT `zk_appointment_items_appointment_id_foreign` FOREIGN KEY (`appointment_id`) REFERENCES `zk_appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_appointment_items_promotion_id_foreign` FOREIGN KEY (`promotion_id`) REFERENCES `zk_promotions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `zk_appointment_items_service_id_foreign` FOREIGN KEY (`service_id`) REFERENCES `zk_services` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET FOREIGN_KEY_CHECKS=1;
