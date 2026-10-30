-- Tabela `zk_service_staff_member`: šema i podaci iz lokalne baze (30.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_service_staff_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_service_staff_member` (
  `service_id` bigint unsigned NOT NULL,
  `staff_member_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`service_id`,`staff_member_id`),
  KEY `zk_service_staff_member_staff_member_id_foreign` (`staff_member_id`),
  CONSTRAINT `zk_service_staff_member_service_id_foreign` FOREIGN KEY (`service_id`) REFERENCES `zk_services` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_service_staff_member_staff_member_id_foreign` FOREIGN KEY (`staff_member_id`) REFERENCES `zk_staff_members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_service_staff_member` VALUES (1,1),(2,1),(3,1),(4,1),(2,2),(1,3),(3,3),(4,3);

SET FOREIGN_KEY_CHECKS=1;
