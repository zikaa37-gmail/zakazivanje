-- Tabela `zk_cancellation_fees`: šema i podaci iz lokalne baze (14.11.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_cancellation_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_cancellation_fees` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `appointment_id` bigint unsigned NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `late_number` smallint unsigned NOT NULL,
  `base_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `decided_by` bigint unsigned DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `payment_method` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_cancellation_fees_appointment_id_foreign` (`appointment_id`),
  KEY `zk_cancellation_fees_decided_by_foreign` (`decided_by`),
  KEY `zk_cancellation_fees_client_id_status_index` (`client_id`,`status`),
  CONSTRAINT `zk_cancellation_fees_appointment_id_foreign` FOREIGN KEY (`appointment_id`) REFERENCES `zk_appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_cancellation_fees_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `zk_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_cancellation_fees_decided_by_foreign` FOREIGN KEY (`decided_by`) REFERENCES `zk_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET FOREIGN_KEY_CHECKS=1;
