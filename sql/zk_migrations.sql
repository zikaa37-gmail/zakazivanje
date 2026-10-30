-- Tabela `zk_migrations`: šema i podaci iz lokalne baze (30.10.2026). Generiše deploy/build-database.py.

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
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_10_20_100000_create_refresh_tokens_table',1),(5,'2026_10_20_100001_create_business_settings_table',1),(6,'2026_10_21_100000_create_staff_and_services_tables',1),(7,'2026_10_22_100000_create_appointments_tables',1),(8,'2026_10_23_100000_create_notification_tables',1),(9,'2026_10_24_100000_require_account_for_booking',1),(10,'2026_10_25_100000_client_booking_day_rules',2),(12,'2026_10_26_100000_create_gallery_images_table',3),(13,'2026_10_27_100000_add_social_links_to_business_settings_table',4),(14,'2026_10_28_100000_add_payments',5),(15,'2026_10_29_100000_create_reviews_table',6),(16,'2026_10_31_100000_add_audience_to_services_and_gender_to_users',7),(17,'2026_10_31_110000_replace_demo_staff_with_real_staff',8),(18,'2026_10_31_120000_add_cover_image_to_business_settings',9),(19,'2026_11_01_100000_create_opening_hours_and_shifts',10),(20,'2026_11_01_110000_add_favorite_staff_member_to_users',11),(22,'2026_11_02_100000_create_waitlist_entries_table',12),(23,'2026_11_03_100000_add_owner_and_worker_roles',13),(24,'2026_11_04_100000_add_report_settings_to_business_settings',14),(25,'2026_11_05_100000_create_client_discipline',15),(26,'2026_11_06_100000_add_off_peak_discipline_settings',16),(27,'2026_11_07_100000_add_landing_and_marketing',17),(28,'2026_11_08_100000_add_instagram_insights_toggle',18),(29,'2026_11_09_100000_add_logins_to_marketing_visits',19),(30,'2026_11_10_100000_create_instagram_posts',20),(31,'2026_11_11_100000_add_booking_confirmation_to_services',21),(32,'2026_11_12_100000_add_tip_to_appointments',22),(33,'2026_11_13_100000_add_paused_until_to_services',23),(34,'2026_11_14_100000_add_codes_to_promotions',24),(35,'2026_11_15_100000_add_verification_sent_at_to_users',25),(36,'2026_11_16_100000_add_manager_role',26),(37,'2026_11_17_100000_create_staff_notes_tables',27),(38,'2026_11_18_100000_add_note_always_notify_to_business_settings',28),(39,'2026_11_19_100000_add_taken_to_staff_notes',29);

SET FOREIGN_KEY_CHECKS=1;
