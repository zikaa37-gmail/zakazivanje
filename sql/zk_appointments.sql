-- Tabela `zk_appointments`: šema i podaci iz lokalne baze (19.11.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_appointments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_appointments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `staff_member_id` bigint unsigned NOT NULL,
  `recurrence_id` bigint unsigned DEFAULT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `processing_offset` smallint unsigned DEFAULT NULL,
  `processing_minutes` smallint unsigned DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_outcome` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'online',
  `price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `due_amount` decimal(10,2) DEFAULT NULL,
  `paid_amount` decimal(10,2) DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `admin_note` text COLLATE utf8mb4_unicode_ci,
  `completion_note` text COLLATE utf8mb4_unicode_ci,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancelled_by` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `free_change_reason` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `change_notice` json DEFAULT NULL,
  `change_notice_at` timestamp NULL DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `payment_method` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tip` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `reminder_sent_at` timestamp NULL DEFAULT NULL,
  `referral_source` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referral_campaign` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `link_group` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `zk_appointments_recurrence_id_foreign` (`recurrence_id`),
  KEY `zk_appointments_staff_member_id_starts_at_index` (`staff_member_id`,`starts_at`),
  KEY `zk_appointments_client_id_starts_at_index` (`client_id`,`starts_at`),
  KEY `zk_appointments_status_index` (`status`),
  KEY `zk_appointments_link_group_index` (`link_group`),
  KEY `zk_appointments_change_notice_at_index` (`change_notice_at`),
  CONSTRAINT `zk_appointments_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `zk_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_appointments_recurrence_id_foreign` FOREIGN KEY (`recurrence_id`) REFERENCES `zk_appointment_recurrences` (`id`) ON DELETE SET NULL,
  CONSTRAINT `zk_appointments_staff_member_id_foreign` FOREIGN KEY (`staff_member_id`) REFERENCES `zk_staff_members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET FOREIGN_KEY_CHECKS=1;
