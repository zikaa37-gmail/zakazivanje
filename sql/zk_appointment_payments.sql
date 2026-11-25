-- Tabela `zk_appointment_payments`: šema i podaci iz lokalne baze (25.11.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_appointment_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_appointment_payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `appointment_id` bigint unsigned NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `method` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gift_card_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_appointment_payments_appointment_id_foreign` (`appointment_id`),
  KEY `zk_appointment_payments_created_by_foreign` (`created_by`),
  KEY `zk_appointment_payments_gift_card_id_foreign` (`gift_card_id`),
  CONSTRAINT `zk_appointment_payments_appointment_id_foreign` FOREIGN KEY (`appointment_id`) REFERENCES `zk_appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_appointment_payments_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `zk_users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `zk_appointment_payments_gift_card_id_foreign` FOREIGN KEY (`gift_card_id`) REFERENCES `zk_gift_cards` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET FOREIGN_KEY_CHECKS=1;
