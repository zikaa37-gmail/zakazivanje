-- Tabela `zk_migrations`: šema i podaci iz lokalne baze (22.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_10_20_100000_create_refresh_tokens_table',1),(5,'2026_10_20_100001_create_business_settings_table',1),(6,'2026_10_21_100000_create_staff_and_services_tables',1),(7,'2026_10_22_100000_create_appointments_tables',1),(8,'2026_10_23_100000_create_notification_tables',1),(9,'2026_10_24_100000_require_account_for_booking',1),(10,'2026_10_25_100000_client_booking_day_rules',2),(12,'2026_10_26_100000_create_gallery_images_table',3),(13,'2026_10_27_100000_add_social_links_to_business_settings_table',4),(14,'2026_10_28_100000_add_payments',5);

SET FOREIGN_KEY_CHECKS=1;
