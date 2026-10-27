-- Tabela `zk_staff_members`: šema i podaci iz lokalne baze (27.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_staff_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_staff_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `booking_confirmation` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` longtext COLLATE utf8mb4_unicode_ci,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` smallint unsigned NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `rotation_weeks` tinyint unsigned NOT NULL DEFAULT '1',
  `rotation_starts_on` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_staff_members` VALUES (1,'Jelena','Matović','Frizer (muški i ženski)',NULL,'jelena@demo.zakazivanje.rs','#15803d',NULL,NULL,1,0,'2026-10-21 08:59:46','2026-10-27 10:04:52',1,NULL),(2,'Marko','Matović','Muški frizer',NULL,NULL,'#b45309','automatic',NULL,1,1,'2026-10-21 08:59:46','2026-10-22 13:18:06',1,NULL),(3,'Sandra','Afrika','Ženski frizer',NULL,NULL,'#7c3aed',NULL,NULL,1,2,'2026-10-21 08:59:46','2026-10-27 09:19:46',1,NULL);

SET FOREIGN_KEY_CHECKS=1;
