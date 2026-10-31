-- Tabela `zk_reviews`: šema i podaci iz lokalne baze (31.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_reviews` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `appointment_id` bigint unsigned NOT NULL,
  `client_id` bigint unsigned NOT NULL,
  `staff_member_id` bigint unsigned DEFAULT NULL,
  `rating` tinyint unsigned NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci,
  `visible` tinyint(1) NOT NULL DEFAULT '1',
  `reply` text COLLATE utf8mb4_unicode_ci,
  `replied_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `zk_reviews_appointment_id_unique` (`appointment_id`),
  KEY `zk_reviews_client_id_foreign` (`client_id`),
  KEY `zk_reviews_staff_member_id_foreign` (`staff_member_id`),
  KEY `zk_reviews_visible_created_at_index` (`visible`,`created_at`),
  CONSTRAINT `zk_reviews_appointment_id_foreign` FOREIGN KEY (`appointment_id`) REFERENCES `zk_appointments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_reviews_client_id_foreign` FOREIGN KEY (`client_id`) REFERENCES `zk_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `zk_reviews_staff_member_id_foreign` FOREIGN KEY (`staff_member_id`) REFERENCES `zk_staff_members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=92 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_reviews` VALUES (47,1249,44,2,5,'Sve preporuke.',1,NULL,NULL,'2026-10-21 06:00:00','2026-10-27 10:05:12'),(48,1251,48,2,5,'Prijatna atmosfera i odlična usluga.',1,NULL,NULL,'2026-10-20 19:00:00','2026-10-27 10:05:12'),(49,1085,64,1,4,NULL,1,NULL,NULL,'2026-10-03 06:30:00','2026-10-27 10:05:12'),(50,1146,49,1,5,'Prijatna atmosfera i odlična usluga.',1,NULL,NULL,'2026-10-09 23:15:00','2026-10-27 10:05:13'),(51,1104,65,3,5,NULL,1,NULL,NULL,'2026-10-07 02:00:00','2026-10-27 10:05:13'),(52,1053,63,3,5,NULL,1,NULL,NULL,'2026-09-30 23:30:00','2026-10-27 10:05:13'),(53,1090,68,2,3,'Kasnili su 15 minuta.',1,NULL,NULL,'2026-10-02 23:00:00','2026-10-27 10:05:13'),(54,1036,48,1,5,'Sve preporuke.',1,NULL,NULL,'2026-09-28 21:00:00','2026-10-27 10:05:13'),(55,1275,56,2,5,NULL,1,NULL,NULL,'2026-10-23 22:30:00','2026-10-27 10:05:13'),(56,1155,44,2,4,'Zadovoljna sam, doći ću ponovo.',1,NULL,NULL,'2026-10-10 07:00:00','2026-10-27 10:05:13'),(57,732,56,1,5,NULL,1,NULL,NULL,'2026-08-31 22:15:00','2026-10-27 10:05:13'),(58,722,47,3,4,'Dobra usluga.',1,NULL,NULL,'2026-08-29 16:00:00','2026-10-27 10:05:13'),(59,715,47,1,3,'Kasnili su 15 minuta.',1,NULL,NULL,'2026-08-28 18:00:00','2026-10-27 10:05:13'),(60,1066,56,3,5,'Prijatna atmosfera i odlična usluga.',1,NULL,NULL,'2026-10-01 14:15:00','2026-10-27 10:05:13'),(61,893,48,2,3,'Solidno, ali sam očekivao više.',1,NULL,NULL,'2026-09-15 15:45:00','2026-10-27 10:05:13'),(62,1100,50,1,5,'Sve preporuke.',1,NULL,NULL,'2026-10-06 20:00:00','2026-10-27 10:05:13'),(63,936,50,2,5,'Prijatna atmosfera i odlična usluga.',1,NULL,NULL,'2026-09-18 21:30:00','2026-10-27 10:05:13'),(64,1041,54,1,5,'Prijatna atmosfera i odlična usluga.',1,NULL,NULL,'2026-09-29 10:30:00','2026-10-27 10:05:13'),(65,961,53,3,5,NULL,1,NULL,NULL,'2026-09-22 21:15:00','2026-10-27 10:05:13'),(66,822,51,3,5,'Profesionalno i brzo.',1,NULL,NULL,'2026-09-10 13:45:00','2026-10-27 10:05:13'),(67,1247,53,1,5,'Najbolja frizura do sada, hvala!',1,NULL,NULL,'2026-10-21 03:30:00','2026-10-27 10:05:13'),(68,1242,54,3,5,'Profesionalno i brzo.',1,NULL,NULL,'2026-10-20 20:45:00','2026-10-27 10:05:13'),(69,1017,58,2,4,NULL,1,NULL,NULL,'2026-09-27 10:30:00','2026-10-27 10:05:13'),(70,939,47,2,5,'Odlično kao i uvek!',1,NULL,NULL,'2026-09-18 22:45:00','2026-10-27 10:05:13'),(71,1000,50,1,4,NULL,1,NULL,NULL,'2026-09-25 11:45:00','2026-10-27 10:05:13'),(72,957,51,3,3,'Solidno, ali sam očekivao više.',1,NULL,NULL,'2026-09-21 17:30:00','2026-10-27 10:05:13'),(73,902,65,1,4,NULL,1,NULL,NULL,'2026-09-17 14:30:00','2026-10-27 10:05:13'),(74,766,47,3,5,'Prijatna atmosfera i odlična usluga.',1,NULL,NULL,'2026-09-03 17:45:00','2026-10-27 10:05:13'),(75,1026,63,2,5,NULL,1,NULL,NULL,'2026-09-27 19:30:00','2026-10-27 10:05:13'),(76,829,53,1,5,'Profesionalno i brzo.',1,NULL,NULL,'2026-09-11 12:30:00','2026-10-27 10:05:13'),(77,965,65,1,4,'Zadovoljna sam, doći ću ponovo.',1,NULL,NULL,'2026-09-24 09:15:00','2026-10-27 10:05:13'),(78,1264,68,2,4,NULL,1,NULL,NULL,'2026-10-22 23:00:00','2026-10-27 10:05:13'),(79,1183,50,2,5,'Odlično kao i uvek!',1,NULL,NULL,'2026-10-14 19:00:00','2026-10-27 10:05:13'),(80,969,68,2,5,'Najbolja frizura do sada, hvala!',1,NULL,NULL,'2026-09-24 00:30:00','2026-10-27 10:05:13'),(81,985,65,2,5,NULL,1,NULL,NULL,'2026-09-25 05:00:00','2026-10-27 10:05:13'),(82,990,70,3,4,'Vrlo dobro, samo malo čekanja.',1,NULL,NULL,'2026-09-24 14:15:00','2026-10-27 10:05:13'),(83,737,50,3,3,'Solidno, ali sam očekivao više.',1,NULL,NULL,'2026-09-02 14:45:00','2026-10-27 10:05:13'),(84,842,61,1,4,NULL,1,NULL,NULL,'2026-09-11 13:00:00','2026-10-27 10:05:13'),(85,954,46,1,5,'Odlično kao i uvek!',1,NULL,NULL,'2026-09-23 06:45:00','2026-10-27 10:05:13'),(86,1250,63,2,5,NULL,1,NULL,NULL,'2026-10-21 14:00:00','2026-10-27 10:05:13'),(87,1091,39,3,5,'Najbolja frizura do sada, hvala!',1,NULL,NULL,'2026-10-04 09:30:00','2026-10-27 10:05:13'),(88,1145,62,3,5,'Odlično kao i uvek!',1,NULL,NULL,'2026-10-09 18:45:00','2026-10-27 10:05:13'),(89,1140,65,3,4,'Zadovoljna sam, doći ću ponovo.',1,NULL,NULL,'2026-10-08 20:00:00','2026-10-27 10:05:13'),(90,1078,67,3,5,'Profesionalno i brzo.',1,NULL,NULL,'2026-10-03 07:30:00','2026-10-27 10:05:13'),(91,1134,56,1,3,'Solidno, ali sam očekivao više.',1,NULL,NULL,'2026-10-09 13:00:00','2026-10-27 10:05:13');

SET FOREIGN_KEY_CHECKS=1;
