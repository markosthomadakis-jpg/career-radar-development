CREATE TABLE `cv_profile_budget` (
  `id` integer PRIMARY KEY NOT NULL,
  `used` integer NOT NULL DEFAULT 0 CHECK (`used` IN (0, 1))
);
INSERT INTO `cv_profile_budget` (`id`, `used`) VALUES (1, 0);
