-- Migration: Add Firebase compatibility fields
-- This migration adds fields that exist in Firebase but are missing in Supabase

-- ====================================
-- Add missing fields to leads table
-- ====================================

-- AVM (Automated Valuation Model) - property valuation estimate
ALTER TABLE leads ADD COLUMN IF NOT EXISTS avm numeric DEFAULT 0.00;

-- Equity - property equity value
ALTER TABLE leads ADD COLUMN IF NOT EXISTS equity numeric DEFAULT 0.00;

-- Market Status - current market status of the property
ALTER TABLE leads ADD COLUMN IF NOT EXISTS market_status text;

-- Add comment for documentation
COMMENT ON COLUMN leads.avm IS 'Automated Valuation Model - property valuation estimate';
COMMENT ON COLUMN leads.equity IS 'Property equity value';
COMMENT ON COLUMN leads.market_status IS 'Current market status of the property';

-- ====================================
-- Add missing fields to user_claims table
-- ====================================

-- Source - where the claim originated (manual, pack, subscription, auto)
ALTER TABLE user_claims ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Pack Name - name of the purchased pack (for pack claims)
ALTER TABLE user_claims ADD COLUMN IF NOT EXISTS pack_name text;

-- Stripe Session ID - Stripe payment session ID (for pack purchases)
ALTER TABLE user_claims ADD COLUMN IF NOT EXISTS stripe_session_id text;

-- Add comment for documentation
COMMENT ON COLUMN user_claims.source IS 'Origin of the claim: manual, pack, subscription, or auto';
COMMENT ON COLUMN user_claims.pack_name IS 'Name of the purchased pack (for pack claims)';
COMMENT ON COLUMN user_claims.stripe_session_id IS 'Stripe payment session ID (for pack purchases)';

-- Add check constraint for source values
ALTER TABLE user_claims ADD CONSTRAINT user_claims_source_check
  CHECK (source IN ('manual', 'pack', 'subscription', 'auto'));

-- Create index for source filtering
CREATE INDEX IF NOT EXISTS idx_user_claims_source ON user_claims(source);

-- Create index for stripe_session_id lookups
CREATE INDEX IF NOT EXISTS idx_user_claims_stripe_session ON user_claims(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
