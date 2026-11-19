-- Tabela `zk_notification_logs`: šema i podaci iz lokalne baze (19.11.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_notification_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_notification_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `appointment_id` bigint unsigned DEFAULT NULL,
  `type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `error` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `zk_notification_logs_user_id_foreign` (`user_id`),
  KEY `zk_notification_logs_appointment_id_foreign` (`appointment_id`),
  KEY `zk_notification_logs_created_at_index` (`created_at`),
  CONSTRAINT `zk_notification_logs_appointment_id_foreign` FOREIGN KEY (`appointment_id`) REFERENCES `zk_appointments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `zk_notification_logs_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `zk_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_notification_logs` VALUES (1,4,NULL,'test','whatsapp','+381646370620','skipped','Twilio nije podešen','2026-11-17 14:00:02'),(2,4,NULL,'test','mail','devtestzikaa+danijela@gmail.com','sent',NULL,'2026-11-17 14:00:07'),(3,4,NULL,'test','mail','devtestzikaa+danijela@gmail.com','sent',NULL,'2026-11-17 14:01:11'),(4,1,NULL,'staff_note','mail','luka@fiskultura.rs','sent',NULL,'2026-11-18 11:10:05'),(5,6,NULL,'staff_note','mail','devtestzikaa+vuk@gmail.com','sent',NULL,'2026-11-18 11:10:05'),(6,7,NULL,'staff_note','mail','devtestzikaa+tijana@gmail.com','sent',NULL,'2026-11-18 11:10:05'),(7,NULL,NULL,'staff_invite','mail','crudtest.menadzer@example.com','sent',NULL,'2026-11-18 15:32:03'),(8,1,NULL,'staff_note','mail','luka@fiskultura.rs','sent',NULL,'2026-11-18 15:32:23'),(9,6,NULL,'staff_note','mail','devtestzikaa+vuk@gmail.com','sent',NULL,'2026-11-18 15:32:23'),(10,7,NULL,'staff_note','mail','devtestzikaa+tijana@gmail.com','sent',NULL,'2026-11-18 15:32:23'),(11,8,NULL,'staff_note','mail','luka.matovic@gmail.com','sent',NULL,'2026-11-18 15:32:23'),(12,NULL,NULL,'staff_note','mail','crudtest.radnik@example.com','sent',NULL,'2026-11-18 15:32:23'),(13,NULL,NULL,'staff_note','mail','crudtest.menadzer@example.com','sent',NULL,'2026-11-18 15:32:23'),(18,NULL,NULL,'email_verification','mail','crudtest.reg@example.com','sent',NULL,'2026-11-18 15:46:58');

SET FOREIGN_KEY_CHECKS=1;
