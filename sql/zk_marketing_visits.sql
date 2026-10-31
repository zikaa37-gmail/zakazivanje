-- Tabela `zk_marketing_visits`: šema i podaci iz lokalne baze (31.10.2026). Generiše deploy/build-database.py.

SET NAMES utf8mb4;
SET TIME_ZONE='+00:00';
SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';

DROP TABLE IF EXISTS `zk_marketing_visits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zk_marketing_visits` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `visited_on` date NOT NULL,
  `source` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `campaign` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `visits` int unsigned NOT NULL DEFAULT '0',
  `logins` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `zk_marketing_visits_visited_on_source_campaign_unique` (`visited_on`,`source`,`campaign`)
) ENGINE=InnoDB AUTO_INCREMENT=119 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
INSERT INTO `zk_marketing_visits` VALUES (1,'2026-10-27','instagram','story-test',1,0),(2,'2026-10-27','direct','',27,0),(29,'2026-10-30','direct','',81,0),(110,'2026-10-31','direct','',9,0);

SET FOREIGN_KEY_CHECKS=1;
