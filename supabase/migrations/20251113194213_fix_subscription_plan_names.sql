-- Migration: Fix subscription plan names to match application expectations
-- Description: Update plan names from 'dollar_lead_club' and 'diamond_lead_club' to 'dollar-lead' and 'diamond-lead'
-- This fixes the mismatch between webhook-saved plan names and application-expected plan names
-- The application expects hyphenated format: 'dollar-lead' and 'diamond-lead'

-- Update dollar_lead_club to dollar-lead
UPDATE users
SET subscription_plan = 'dollar-lead'
WHERE subscription_plan = 'dollar_lead_club';

-- Update diamond_lead_club to diamond-lead
UPDATE users
SET subscription_plan = 'diamond-lead'
WHERE subscription_plan = 'diamond_lead_club';

-- Log the changes (optional, for verification)
-- You can check how many rows were affected by running:
-- SELECT COUNT(*) FROM users WHERE subscription_plan IN ('dollar-lead', 'diamond-lead');
