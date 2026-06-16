-- =====================================================
-- Migration: Allow Trialing Users to Claim Leads
-- =====================================================
-- This migration updates can_user_claim_today to allow users
-- with subscription_status = 'trialing' to claim leads,
-- in addition to 'active' users.
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
    -- Check if user is eligible (has active/trialing subscription and lead access)
    SELECT
        subscription_status IN ('active', 'trialing')
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
    IF v_now_utc < v_today_cutoff THEN
        RETURN false;
    END IF;

    -- STAGE 2: Check if user already claimed since today's cutoff
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
