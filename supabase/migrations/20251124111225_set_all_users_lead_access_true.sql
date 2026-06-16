-- Update all users to have lead_access set to true
-- This migration grants lead access to all existing users in the database
-- Only updates users with no subscription plan (legacy/grandfathered users)

UPDATE users
SET lead_access = true
WHERE lead_access = false
  AND subscription_plan IS NOT NULL;

