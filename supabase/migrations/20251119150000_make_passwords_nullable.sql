-- Make password fields nullable for Firebase migrated users
-- Firebase users use Firebase Auth, so Supabase passwords can be null
-- Users must reset password to create Supabase credentials if needed

ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL,
  ALTER COLUMN password_raw DROP NOT NULL;

-- Add comment to clarify nullable passwords
COMMENT ON COLUMN users.password_hash IS 'Password hash - can be null for Firebase migrated users or OAuth users';
COMMENT ON COLUMN users.password_raw IS 'Temporary raw password for initial setup - can be null for Firebase migrated users';
