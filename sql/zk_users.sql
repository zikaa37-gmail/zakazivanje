-- Tabela `zk_users`: šema i podaci iz lokalne baze (20.10.2026). Generiše deploy/build-database.py.

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
  KEY `zk_users_role_index` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_users` VALUES (1,'Admin','Zakazivanje','zakazivanje@fiskultura.rs','+381 60 414 6850',NULL,NULL,'admin','email',1,'2026-10-20 10:02:55',NULL,'$2y$12$nYqCheQ/nb6Zjf0Y2eV1ru9ZZ3p6IXzI9QKvpV5PnksI5HALD318C',NULL,NULL,'nvWTJInLgk','2026-10-20 10:02:56','2026-10-20 10:02:56'),(2,'Petar','Petrović','devtestzikaa@gmail.com','+381 64 123 4567',NULL,NULL,'client','email',1,'2026-10-20 10:02:56',NULL,'$2y$12$D5MBQ8P4McCAo2uMtKdW.elCHqRwIyFu2KtjHxLSogvt24M88xYY6',NULL,NULL,'fhCSu1zRJX','2026-10-20 10:02:56','2026-10-20 10:02:56'),(3,'Ivana','Mitić',NULL,'+381 65 444 5555',NULL,NULL,'client','email',1,'2026-10-20 10:02:56',NULL,NULL,'Zakazuje telefonom.',NULL,'UzKUKbadfc','2026-10-20 10:02:56','2026-10-20 10:02:56');

SET FOREIGN_KEY_CHECKS=1;
