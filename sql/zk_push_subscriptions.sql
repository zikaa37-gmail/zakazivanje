-- Tabela `zk_push_subscriptions`: šema i podaci iz lokalne baze (18.11.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_push_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_push_subscriptions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `endpoint_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `endpoint` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `p256dh` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `auth` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `zk_push_subscriptions_endpoint_hash_unique` (`endpoint_hash`),
  KEY `zk_push_subscriptions_user_id_foreign` (`user_id`),
  CONSTRAINT `zk_push_subscriptions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `zk_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_push_subscriptions` VALUES (3,1,'faa86ab3661a1b26cb02fd7813828a2866018bf0e0668ea1c6ac24a5bb77c3b7','https://fcm.googleapis.com/fcm/send/dKh3B-9wt5w:APA91bHzgPQdM1smOyb91SbB9Xk1bErwBebf153b0xatkzLEhI-73fyp1NruTqW1j_dp2BVOpSKGwnq7eN2c33lJXMkT231RUUf4OjJvS7vFRaNywXvydnYL8Tczcpl8bNVs22pEw5QV','BPca6KQFNQ5Pf5mrnYslqoBiiDlEeC1CvS-UXZH7MzMywbBEHxD0V8rRyk6W-n-zaao7ntfEAbyMe64HmG4CKA4','2PH7dEEOdS1D_Iw2ABFiBQ','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36','2026-11-18 15:46:23','2026-11-18 15:46:23');

SET FOREIGN_KEY_CHECKS=1;
