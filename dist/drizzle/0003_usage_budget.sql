CREATE TABLE `usage_budget` (
  `day` text NOT NULL,
  `route` text NOT NULL,
  `used` integer NOT NULL DEFAULT 0 CHECK (`used` >= 0),
  PRIMARY KEY (`day`, `route`)
);
