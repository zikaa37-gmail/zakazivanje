-- Tabela `zk_users`: šema i podaci iz lokalne baze (18.11.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nickname` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `favorite_staff_member_id` bigint unsigned DEFAULT NULL,
  `staff_member_id` bigint unsigned DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsapp_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` longtext COLLATE utf8mb4_unicode_ci,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'client',
  `discipline_zone` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'green',
  `discipline_points` decimal(6,1) NOT NULL DEFAULT '0.0',
  `zone_manual` tinyint(1) NOT NULL DEFAULT '0',
  `zone_until` date DEFAULT NULL,
  `zone_reason` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zone_changed_at` timestamp NULL DEFAULT NULL,
  `preferred_communication` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'email',
  `ui_mode` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'standard',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `email_verification_token` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verification_sent_at` timestamp NULL DEFAULT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `signup_source` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `signup_campaign` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancellation_discount_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cancellation_discount_value` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `zk_users_email_unique` (`email`),
  UNIQUE KEY `zk_users_email_verification_token_unique` (`email_verification_token`),
  UNIQUE KEY `zk_users_staff_member_id_unique` (`staff_member_id`),
  KEY `zk_users_role_index` (`role`),
  KEY `zk_users_favorite_staff_member_id_foreign` (`favorite_staff_member_id`),
  KEY `zk_users_discipline_zone_index` (`discipline_zone`),
  CONSTRAINT `zk_users_favorite_staff_member_id_foreign` FOREIGN KEY (`favorite_staff_member_id`) REFERENCES `zk_staff_members` (`id`) ON DELETE SET NULL,
  CONSTRAINT `zk_users_staff_member_id_foreign` FOREIGN KEY (`staff_member_id`) REFERENCES `zk_staff_members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_users` VALUES (1,'Luka','Matović',NULL,NULL,NULL,NULL,'luka@fiskultura.rs',NULL,NULL,NULL,'manager','green',0.0,0,NULL,NULL,NULL,'email','standard',1,'2026-11-17 12:40:30',NULL,NULL,'$2y$12$nmPdZZPbEDJ..u0/A3PvqehDDT1lZiORxGj1B86EvTr2/KSx2eCFe',NULL,'2026-11-18 10:18:16',NULL,'2026-11-17 12:40:36','2026-11-18 10:18:39',NULL,NULL,NULL,NULL),(3,'Petar','Petrović',NULL,'male',NULL,NULL,'devtestzikaa+klijent@gmail.com','+381 64 123 4567',NULL,NULL,'client','green',0.0,0,NULL,NULL,NULL,'email','standard',1,'2026-10-21 08:59:46',NULL,NULL,'$2y$12$zpkbMytanjbtFvI4pXNn9u5jCl/vJFjIWhjDMKcRBFa/fvvFxgKBe',NULL,'2026-11-18 11:10:12',NULL,'2026-11-17 12:40:36','2026-11-18 11:10:12',NULL,NULL,NULL,NULL),(4,'Danijela','Đokić',NULL,NULL,NULL,1,'devtestzikaa+danijela@gmail.com','+381646370620',NULL,NULL,'owner','green',0.0,0,NULL,NULL,NULL,'email','standard',1,'2026-11-17 13:07:44',NULL,NULL,'$2y$12$y/wxMLy0u.C6IUqFsXcubO9gDWaxA8ZyBCGgDTUGEqEJKiYxNDWNe',NULL,'2026-11-18 11:09:59',NULL,'2026-11-17 13:07:44','2026-11-18 11:09:59',NULL,NULL,NULL,NULL),(6,'Vuk','Matović',NULL,NULL,NULL,NULL,'devtestzikaa+vuk@gmail.com',NULL,NULL,NULL,'manager','green',0.0,0,NULL,NULL,NULL,'email','standard',1,'2026-11-17 13:07:45',NULL,NULL,'$2y$12$UCyMSvZGz75MxExaBBjO3eGd3YGJqAsKNrGHOwNVF5Ao1TqP6hJBm',NULL,NULL,NULL,'2026-11-17 13:07:45','2026-11-17 13:07:45',NULL,NULL,NULL,NULL),(7,'Tijana','XXX',NULL,NULL,NULL,2,'devtestzikaa+tijana@gmail.com','063111111',NULL,NULL,'worker','green',0.0,0,NULL,NULL,NULL,'email','standard',1,'2026-11-17 13:07:45',NULL,NULL,'$2y$12$1LtblA4LCy3tVDwYHGAG1uQhpHepLcN3jg1e3UsVMdrmneGIIvima',NULL,'2026-11-17 18:04:49',NULL,'2026-11-17 13:07:45','2026-11-17 18:04:49',NULL,NULL,NULL,NULL);

SET FOREIGN_KEY_CHECKS=1;
