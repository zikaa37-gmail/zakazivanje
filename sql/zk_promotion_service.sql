-- Tabela `zk_promotion_service`: šema i podaci iz lokalne baze (31.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_promotion_service`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_promotion_service` (
  `promotion_id` bigint unsigned NOT NULL,
  `service_id` bigint unsigned NOT NULL,
  `quantity` tinyint unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`promotion_id`,`service_id`),
  KEY `zk_promotion_service_service_id_foreign` (`service_id`),
  CONSTRAINT `zk_promotion_service_promotion_id_foreign` FOREIGN KEY (`promotion_id`) REFERENCES `zk_promotions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_promotion_service_service_id_foreign` FOREIGN KEY (`service_id`) REFERENCES `zk_services` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_promotion_service` VALUES (1,1,1),(1,3,1),(2,5,1),(3,2,1);

SET FOREIGN_KEY_CHECKS=1;
