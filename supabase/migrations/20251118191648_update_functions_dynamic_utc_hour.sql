-- =====================================================
-- Migration: Update Database Functions to Use Dynamic UTC Hour
-- =====================================================
-- This migration updates two database functions to read the UTC hour
-- from the settings table instead of using a hardcoded value.
--
-- Functions updated:
-- 1. can_user_claim_today - Check if user can claim leads today
-- 2. process_missing_claims - Reconcile missing claims for a target date
--
-- Both functions now read config.schedule.utc_hour from the settings table
-- with a fallback to 8 if settings are not found.
-- =====================================================

-- =====================================================
-- 1. UPDATE: can_user_claim_today
-- =====================================================
-- Check if a user can claim leads today based on their last claim
-- and the configured UTC cutoff hour from settings.
-- =====================================================
CREATE OR REPLACE FUNCTION can_user_claim_today(
    p_user_id UUID,
    p_lead_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_last_claim TIMESTAMPTZ;
    v_cutoff_time TIMESTAMPTZ;
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

    -- Get user's last claim of this type
    SELECT MAX(claimed_at) INTO v_last_claim
    FROM user_claims
    WHERE user_id = p_user_id AND type = p_lead_type;

    -- If no previous claim, user can claim
    IF v_last_claim IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Get UTC hour from settings (default to 8 if not found)
    v_utc_hour := COALESCE(
        (get_setting('auto-claim')->'schedule'->>'utc_hour')::INTEGER,
        8
    );

    -- Get current time in UTC
    v_now_utc := NOW() AT TIME ZONE 'UTC';

    -- Calculate today's cutoff time (configured UTC hour) using explicit UTC
    v_cutoff_time := DATE_TRUNC('day', v_now_utc) + (v_utc_hour || ' hours')::INTERVAL;

    -- If current time is before the configured UTC hour, use yesterday's cutoff
    IF v_now_utc < v_cutoff_time THEN
        v_cutoff_time := v_cutoff_time - INTERVAL '1 day';
    END IF;

    -- User can claim if last claim was before the cutoff
    RETURN v_last_claim < v_cutoff_time;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. UPDATE: process_missing_claims
-- =====================================================
-- Process and reconcile missing claims for users on a target date.
-- Uses dynamic UTC hour from settings for claim window calculation.
-- =====================================================
CREATE OR REPLACE FUNCTION process_missing_claims(
    p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_config JSONB;
    v_plan_config JSONB;
    v_stats JSON;
    v_claims_created INTEGER := 0;
    v_leads_distributed INTEGER := 0;
    v_users_processed INTEGER := 0;
    v_users_skipped INTEGER := 0;
    v_errors INTEGER := 0;
    v_dollar_leads_expected INTEGER;
    v_diamond_leads_expected INTEGER;
    v_dollar_leads_received INTEGER;
    v_diamond_leads_received INTEGER;
    v_dollar_leads_needed INTEGER;
    v_diamond_leads_needed INTEGER;
    v_weekdays_only BOOLEAN;
    v_target_dow INTEGER;
    v_is_target_weekday BOOLEAN;
    v_cutoff_start TIMESTAMPTZ;
    v_cutoff_end TIMESTAMPTZ;
    v_diamond_available INTEGER;
    v_dollar_available INTEGER;
    v_diamond_to_assign INTEGER;
    v_dollar_to_assign INTEGER;
    v_utc_hour INTEGER;
BEGIN
    -- Get auto-claim configuration
    v_config := get_setting('auto-claim');

    IF v_config IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Auto-claim configuration not found',
            'executed_at', NOW()
        );
    END IF;

    -- Get UTC hour from settings (default to 8 if not found)
    v_utc_hour := COALESCE(
        (v_config->'schedule'->>'utc_hour')::INTEGER,
        8
    );

    -- Calculate the claim window for target date using dynamic UTC hour
    -- Window: [target_date at utc_hour] to [target_date+1 at utc_hour]
    v_cutoff_start := p_target_date + (v_utc_hour || ' hours')::INTERVAL;
    v_cutoff_end := p_target_date + INTERVAL '1 day' + (v_utc_hour || ' hours')::INTERVAL;

    -- Get day of week for target date
    v_target_dow := EXTRACT(DOW FROM p_target_date)::INTEGER;
    v_is_target_weekday := v_target_dow BETWEEN 1 AND 5;

    -- Loop through all active users with lead access
    FOR v_user IN
        SELECT id, subscription_plan, email, name
        FROM users
        WHERE subscription_status = 'active'
          AND lead_access = true
          AND subscription_plan IS NOT NULL
    LOOP
        BEGIN
            v_users_processed := v_users_processed + 1;

            -- Get plan-specific configuration
            v_plan_config := v_config->'plans'->v_user.subscription_plan;

            IF v_plan_config IS NULL THEN
                v_users_skipped := v_users_skipped + 1;
                CONTINUE;
            END IF;

            -- Extract expected lead counts from config
            v_dollar_leads_expected := COALESCE((v_plan_config->>'dollar_leads')::INTEGER, 0);
            v_diamond_leads_expected := COALESCE((v_plan_config->>'diamond_leads')::INTEGER, 0);
            v_weekdays_only := COALESCE((v_plan_config->>'weekdays_only')::BOOLEAN, FALSE);

            -- Check weekday restriction
            IF v_weekdays_only AND NOT v_is_target_weekday THEN
                v_users_skipped := v_users_skipped + 1;
                CONTINUE;
            END IF;

            -- Get how many leads user already received for target date
            -- Dollar leads
            SELECT COALESCE(SUM(uc.lead_count), 0)::INTEGER
            INTO v_dollar_leads_received
            FROM user_claims uc
            WHERE uc.user_id = v_user.id
              AND uc.type = 'dollar-lead'
              AND uc.claimed_at >= v_cutoff_start
              AND uc.claimed_at < v_cutoff_end;

            -- Diamond leads
            SELECT COALESCE(SUM(uc.lead_count), 0)::INTEGER
            INTO v_diamond_leads_received
            FROM user_claims uc
            WHERE uc.user_id = v_user.id
              AND uc.type = 'diamond-lead'
              AND uc.claimed_at >= v_cutoff_start
              AND uc.claimed_at < v_cutoff_end;

            -- Calculate how many more leads are needed
            v_dollar_leads_needed := GREATEST(v_dollar_leads_expected - v_dollar_leads_received, 0);
            v_diamond_leads_needed := GREATEST(v_diamond_leads_expected - v_diamond_leads_received, 0);

            -- Skip if user already has all expected leads
            IF v_dollar_leads_needed = 0 AND v_diamond_leads_needed = 0 THEN
                CONTINUE;
            END IF;

            -- Get available lead counts
            v_diamond_available := get_available_lead_count('diamond-lead');
            v_dollar_available := get_available_lead_count('dollar-lead');

            -- Assign diamond leads if needed and available
            IF v_diamond_leads_needed > 0 THEN
                v_diamond_to_assign := LEAST(v_diamond_leads_needed, v_diamond_available);

                IF v_diamond_to_assign > 0 THEN
                    PERFORM create_user_claim(
                        v_user.id,
                        'diamond-lead',
                        v_diamond_to_assign
                    );
                    v_claims_created := v_claims_created + 1;
                    v_leads_distributed := v_leads_distributed + v_diamond_to_assign;
                    v_diamond_available := v_diamond_available - v_diamond_to_assign;
                END IF;
            END IF;

            -- Assign dollar leads if needed and available
            IF v_dollar_leads_needed > 0 THEN
                v_dollar_to_assign := LEAST(v_dollar_leads_needed, v_dollar_available);

                IF v_dollar_to_assign > 0 THEN
                    PERFORM create_user_claim(
                        v_user.id,
                        'dollar-lead',
                        v_dollar_to_assign
                    );
                    v_claims_created := v_claims_created + 1;
                    v_leads_distributed := v_leads_distributed + v_dollar_to_assign;
                    v_dollar_available := v_dollar_available - v_dollar_to_assign;
                END IF;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE NOTICE 'Error processing user %: %', v_user.id, SQLERRM;
        END;
    END LOOP;

    -- Build and return stats
    v_stats := jsonb_build_object(
        'success', TRUE,
        'message', 'Reconciliation completed',
        'target_date', p_target_date,
        'utc_hour_used', v_utc_hour,
        'users_processed', v_users_processed,
        'users_skipped', v_users_skipped,
        'claims_created', v_claims_created,
        'leads_distributed', v_leads_distributed,
        'errors', v_errors,
        'executed_at', NOW()
    );

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Migration Notes
-- =====================================================
-- Both functions now:
-- 1. Read UTC hour from settings.config.schedule.utc_hour
-- 2. Default to 8 if settings not found (backward compatible)
-- 3. Use explicit UTC timezone handling
-- 4. Maintain all existing functionality
--
-- Benefits:
-- - Single source of truth for UTC hour configuration
-- - Consistent with TypeScript code changes
-- - Configurable via admin settings UI
-- =====================================================
