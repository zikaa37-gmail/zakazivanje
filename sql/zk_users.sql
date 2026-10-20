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
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsapp_number` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` longtext COLLATE utf8mb4_unicode_ci,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'client',
  `preferred_communication` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'email',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `email_verification_token` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `zk_users_email_unique` (`email`),
  UNIQUE KEY `zk_users_email_verification_token_unique` (`email_verification_token`),
  KEY `zk_users_role_index` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_users` VALUES (1,'Admin','Zakazivanje','admin@zakazivanje.test','+381 60 527 7642',NULL,NULL,'admin','email',1,'2026-10-20 07:14:02',NULL,'$2y$12$xjGo2ei2WjLgGgr8qjex7.uDk0vitQtgDj4YqjlWP.yftgr1pDFOy',NULL,'q2Zwpx6D54','2026-10-20 07:14:02','2026-10-20 07:14:02'),(2,'Marija','Marković','klijent@zakazivanje.test','+381 60 130 9515',NULL,NULL,'client','email',1,'2026-10-20 07:14:02',NULL,'$2y$12$xjGo2ei2WjLgGgr8qjex7.uDk0vitQtgDj4YqjlWP.yftgr1pDFOy',NULL,'58o1RdFFWC','2026-10-20 07:14:02','2026-10-20 07:14:02');

SET FOREIGN_KEY_CHECKS=1;
