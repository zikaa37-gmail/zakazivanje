-- Tabela `zk_instagram_posts`: šema i podaci iz lokalne baze (31.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_instagram_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_instagram_posts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `kind` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `caption` text COLLATE utf8mb4_unicode_ci,
  `image` longtext COLLATE utf8mb4_unicode_ci,
  `token` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scheduled_at` datetime NOT NULL,
  `published_at` datetime DEFAULT NULL,
  `media_id` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permalink` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error` text COLLATE utf8mb4_unicode_ci,
  `slots` json DEFAULT NULL,
  `created_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `zk_instagram_posts_token_unique` (`token`),
  KEY `zk_instagram_posts_created_by_foreign` (`created_by`),
  KEY `zk_instagram_posts_status_index` (`status`),
  KEY `zk_instagram_posts_scheduled_at_index` (`scheduled_at`),
  CONSTRAINT `zk_instagram_posts_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `zk_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

SET FOREIGN_KEY_CHECKS=1;
