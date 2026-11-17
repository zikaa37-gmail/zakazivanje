-- Tabela `zk_service_staff_member`: šema i podaci iz lokalne baze (17.11.2026). Generiše deploy/build-database.py.

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
INSERT INTO `zk_service_staff_member` VALUES (22,1),(24,1),(25,1),(26,1),(27,1),(28,1),(29,1),(30,1),(31,1),(1,2),(2,2),(3,2),(4,2),(5,2),(6,2),(7,2),(8,2),(9,2),(10,2),(11,2),(12,2),(13,2),(14,2),(15,2),(16,2),(17,2),(18,2),(19,2),(20,2),(21,2);

SET FOREIGN_KEY_CHECKS=1;
