-- Fix the incorrect check constraint on status column
-- The original migration had: CHECK (type IN (...)) instead of CHECK (status IN (...))

-- Drop the incorrect constraint (PostgreSQL auto-named it leads_type_check1)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_type_check1;

-- Add the correct constraint for status
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('available', 'claimed', 'expired'));
