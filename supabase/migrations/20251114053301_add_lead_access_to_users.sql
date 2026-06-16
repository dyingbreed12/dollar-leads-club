-- Add lead_access column to users table
-- This column controls whether users have access to leads
-- Default value is false, meaning users don't have lead access by default until granted by an admin

ALTER TABLE users ADD COLUMN IF NOT EXISTS lead_access BOOLEAN DEFAULT false;

-- Create index for the lead_access column to optimize queries filtering by lead access status
CREATE INDEX IF NOT EXISTS idx_users_lead_access ON users(lead_access);
