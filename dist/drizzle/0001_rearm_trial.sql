-- Explicitly authorised one-time retry after the initial request was rejected
-- with HTTP 429 and API credits were added. This migration applies once.
UPDATE `ai_trial_budget` SET `used` = 0 WHERE `id` = 1 AND `used` = 1;
