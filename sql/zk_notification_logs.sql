-- Tabela `zk_notification_logs`: šema i podaci iz lokalne baze (22.10.2026). Generiše deploy/build-database.py.

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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_notification_logs` VALUES (1,2,2,'appointment_received','mail','devtestzikaa@gmail.com','sent',NULL,'2026-10-21 11:14:30'),(2,1,2,'admin_client_rescheduled','mail','zakazivanje@fiskultura.rs','sent',NULL,'2026-10-21 11:14:30'),(3,2,2,'review_request','mail','devtestzikaa@gmail.com','sent',NULL,'2026-10-22 12:26:30'),(4,1,NULL,'test','whatsapp','+381609399065','skipped','Twilio nije podešen','2026-10-22 12:29:26'),(5,1,NULL,'test','mail','zakazivanje@fiskultura.rs','sent',NULL,'2026-10-22 12:29:33'),(6,2,2,'appointment_confirmed','mail','devtestzikaa@gmail.com','sent',NULL,'2026-10-22 12:39:57'),(7,2,NULL,'appointment_received','mail','devtestzikaa@gmail.com','sent',NULL,'2026-10-22 12:55:00'),(8,1,NULL,'admin_new_booking','mail','zakazivanje@fiskultura.rs','sent',NULL,'2026-10-22 12:55:00'),(9,2,NULL,'appointment_received','mail','devtestzikaa@gmail.com','sent',NULL,'2026-10-22 12:55:19'),(10,1,NULL,'admin_new_booking','mail','zakazivanje@fiskultura.rs','sent',NULL,'2026-10-22 12:55:19');

SET FOREIGN_KEY_CHECKS=1;
