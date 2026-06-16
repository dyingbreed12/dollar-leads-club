-- Update subscription_plan values from old format to new format
UPDATE users
SET subscription_plan = 'dollar-lead'
WHERE subscription_plan = 'dollar';

UPDATE users
SET subscription_plan = 'diamond-lead'
WHERE subscription_plan = 'diamond';
