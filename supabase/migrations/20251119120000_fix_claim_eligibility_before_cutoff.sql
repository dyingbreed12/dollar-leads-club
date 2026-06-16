-- =====================================================
-- Migration: Fix Claim Eligibility Check Before Cutoff Time
-- =====================================================
-- This migration fixes a bug where users could claim leads before
-- the scheduled cutoff time. The previous logic only checked if the
-- user had claimed since yesterday's cutoff, but didn't verify that
-- today's cutoff time had been reached.
--
-- Bug Example:
-- - Schedule set to 9:00am EST (2:00pm UTC)
-- - Current time: 8:55am EST (1:55pm UTC)
-- - Previous behavior: Showed "CLAIM" button ❌
-- - Fixed behavior: Shows countdown timer ✅
--
-- The fix implements two-stage validation:
-- 1. Check if current time >= today's cutoff (claim window open)
-- 2. Check if user already claimed since today's cutoff (hasn't claimed)
-- =====================================================

-- =====================================================
-- UPDATE: can_user_claim_today
-- =====================================================
-- Fixed version that properly checks both:
-- 1. Has today's claim time arrived?
-- 2. Has user already claimed today?
-- =====================================================
CREATE OR REPLACE FUNCTION can_user_claim_today(
    p_user_id UUID,
    p_lead_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_last_claim TIMESTAMPTZ;
    v_today_cutoff TIMESTAMPTZ;
    v_user_eligible BOOLEAN;
    v_utc_hour INTEGER;
    v_now_utc TIMESTAMPTZ;
BEGIN
    -- Check if user is eligible (has active subscription and lead access)
    SELECT
        subscription_status = 'active'
        AND lead_access = true
    INTO v_user_eligible
    FROM users
    WHERE id = p_user_id;

    -- If user not eligible, return false
    IF v_user_eligible IS NULL OR v_user_eligible = false THEN
        RETURN false;
    END IF;

    -- Get UTC hour from settings (default to 13 = 8am EST)
    v_utc_hour := COALESCE(
        (get_setting('auto-claim')->'schedule'->>'utc_hour')::INTEGER,
        13
    );

    -- Get current time in UTC
    v_now_utc := NOW() AT TIME ZONE 'UTC';

    -- Calculate today's cutoff time (configured UTC hour)
    v_today_cutoff := DATE_TRUNC('day', v_now_utc) + (v_utc_hour || ' hours')::INTERVAL;

    -- STAGE 1: Check if we've reached today's claim time
    -- If current time is before today's cutoff, user cannot claim yet
    IF v_now_utc < v_today_cutoff THEN
        RETURN false;
    END IF;

    -- STAGE 2: Check if user already claimed since today's cutoff
    -- Get user's last claim of this type
    SELECT MAX(claimed_at) INTO v_last_claim
    FROM user_claims
    WHERE user_id = p_user_id AND type = p_lead_type;

    -- If no previous claim, user can claim
    IF v_last_claim IS NULL THEN
        RETURN true;
    END IF;

    -- User can claim if last claim was before today's cutoff
    RETURN v_last_claim < v_today_cutoff;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Migration Notes
-- =====================================================
-- Changes from previous version:
-- 1. Removed the problematic "use yesterday's cutoff" logic
-- 2. Added explicit check: current time must be >= today's cutoff
-- 3. Only then check if user already claimed today
--
-- This ensures:
-- - Users cannot claim before the scheduled time
-- - Countdown timer displays correctly before cutoff
-- - Claim button appears only at or after cutoff time
-- - Users can still only claim once per day after cutoff
-- =====================================================
