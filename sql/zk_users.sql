-- Tabela `zk_users`: šema i podaci iz lokalne baze (23.10.2026). Generiše deploy/build-database.py.

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
  `gender` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `favorite_staff_member_id` bigint unsigned DEFAULT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsapp_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` longtext COLLATE utf8mb4_unicode_ci,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'client',
  `preferred_communication` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'email',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `email_verification_token` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `zk_users_email_unique` (`email`),
  UNIQUE KEY `zk_users_email_verification_token_unique` (`email_verification_token`),
  KEY `zk_users_role_index` (`role`),
  KEY `zk_users_favorite_staff_member_id_foreign` (`favorite_staff_member_id`),
  CONSTRAINT `zk_users_favorite_staff_member_id_foreign` FOREIGN KEY (`favorite_staff_member_id`) REFERENCES `zk_staff_members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_users` VALUES (1,'Admin','Zakazivanje',NULL,NULL,'zakazivanje@fiskultura.rs','+381 60 939 9065',NULL,NULL,'admin','email',1,'2026-10-21 08:59:46',NULL,'$2y$12$yg.EFtISXgAOinA3uDBF4OkGnx.9p1/R0jDbcJSrbHm4rPaN.XELa',NULL,'2026-10-22 22:03:43','azeMnVBaLT','2026-10-21 08:59:46','2026-10-22 22:03:43'),(2,'Petar','Petrović','male',NULL,'devtestzikaa@gmail.com','+381 64 123 4567',NULL,NULL,'client','email',1,'2026-10-21 08:59:46',NULL,'$2y$12$zpkbMytanjbtFvI4pXNn9u5jCl/vJFjIWhjDMKcRBFa/fvvFxgKBe',NULL,'2026-10-23 07:11:18','0PO2SqGggr','2026-10-21 08:59:46','2026-10-23 07:11:18'),(3,'Ivana','Mitić',NULL,NULL,NULL,'+381 65 444 5555',NULL,NULL,'client','email',1,'2026-10-21 08:59:46',NULL,NULL,'Zakazuje telefonom.',NULL,'h0s66wt0Pf','2026-10-21 08:59:46','2026-10-21 08:59:46');

SET FOREIGN_KEY_CHECKS=1;
