-- =====================================================
-- MIGRATION: Enhance Auto-Claim with Backfill
-- =====================================================
-- Created: 2025-11-19
--
-- IMPORTANT: This migration REPLACES auto_create_daily_claims()
-- from migration 20251116080000_create_settings_and_auto_claim.sql
--
-- New Features:
--   1. Shortfall Detection - Adds missing leads to existing claims
--   2. 7-Day Backfill - Automatically reconciles past week
--   3. Helper Function - add_leads_to_claim() augments claims
--
-- Breaking Changes:
--   - Completely replaces original auto_create_daily_claims() function
--   - Changes return format to include backfill statistics
-- =====================================================

-- =====================================================
-- HELPER FUNCTION: Add Leads to Existing Claim
-- =====================================================

CREATE OR REPLACE FUNCTION add_leads_to_claim(
    p_claim_id UUID,
    p_lead_count INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_claim_type TEXT;
    v_user_id UUID;
    v_leads_added INTEGER := 0;
    v_lead RECORD;
BEGIN
    -- Get claim details
    SELECT type, user_id INTO v_claim_type, v_user_id
    FROM user_claims
    WHERE id = p_claim_id;

    IF v_claim_type IS NULL THEN
        RAISE EXCEPTION 'Claim not found: %', p_claim_id;
    END IF;

    -- Validate lead count
    IF p_lead_count <= 0 THEN
        RETURN 0;
    END IF;

    -- Assign available leads
    FOR v_lead IN
        SELECT id
        FROM leads
        WHERE type = v_claim_type
          AND status = 'available'
        ORDER BY RANDOM()
        LIMIT p_lead_count
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Update lead status
        UPDATE leads
        SET status = 'claimed',
            claimed_by = v_user_id,
            claimed_at = NOW() AT TIME ZONE 'UTC'
        WHERE id = v_lead.id;

        -- Link to claim
        INSERT INTO user_claim_leads (user_claim_id, lead_id)
        VALUES (p_claim_id, v_lead.id);

        v_leads_added := v_leads_added + 1;
    END LOOP;

    -- Update claim's lead_count
    UPDATE user_claims
    SET lead_count = lead_count + v_leads_added,
        updated_at = NOW() AT TIME ZONE 'UTC'
    WHERE id = p_claim_id;

    -- Log if we couldn't fulfill the full request
    IF v_leads_added < p_lead_count THEN
        INSERT INTO system_logs (event_type, event_data, created_at)
        VALUES (
            'insufficient_leads_for_backfill',
            jsonb_build_object(
                'claim_id', p_claim_id,
                'user_id', v_user_id,
                'type', v_claim_type,
                'requested', p_lead_count,
                'available', v_leads_added,
                'shortfall', p_lead_count - v_leads_added
            ),
            NOW() AT TIME ZONE 'UTC'
        );
    END IF;

    RETURN v_leads_added;
END;
$$;

COMMENT ON FUNCTION add_leads_to_claim IS 'Adds additional leads to an existing claim and updates the lead count';

-- =====================================================
-- ENHANCED FUNCTION: Auto-Create Daily Claims with Backfill
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_daily_claims()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_config JSONB;
    v_enabled BOOLEAN;
    v_utc_hour INTEGER;
    v_user RECORD;
    v_plan_config JSONB;
    v_now_utc TIMESTAMPTZ;
    v_today_cutoff TIMESTAMPTZ;
    v_day_of_week INTEGER;
    v_is_weekday BOOLEAN;

    -- Claim tracking
    v_existing_claim RECORD;
    v_claim_id UUID;
    v_expected_dollar INTEGER;
    v_expected_diamond INTEGER;
    v_shortfall INTEGER;
    v_leads_added INTEGER;

    -- Backfill tracking
    v_backfill_enabled BOOLEAN;
    v_backfill_days INTEGER;
    v_target_date DATE;
    v_date_cutoff_start TIMESTAMPTZ;
    v_date_cutoff_end TIMESTAMPTZ;

    -- Statistics
    v_claims_created INTEGER := 0;
    v_claims_filled INTEGER := 0;
    v_backfill_dates_processed INTEGER := 0;
    v_backfill_claims_filled INTEGER := 0;
    v_errors INTEGER := 0;
    v_start_time TIMESTAMPTZ;
    v_execution_id UUID;
BEGIN
    v_start_time := NOW() AT TIME ZONE 'UTC';
    v_execution_id := gen_random_uuid();
    v_now_utc := NOW() AT TIME ZONE 'UTC';

    -- Get configuration
    SELECT config INTO v_config
    FROM settings
    WHERE type = 'auto-claim';

    -- Check if enabled
    v_enabled := COALESCE((v_config->>'enabled')::BOOLEAN, FALSE);

    IF NOT v_enabled THEN
        INSERT INTO system_logs (event_type, event_data, created_at)
        VALUES (
            'auto_claim_disabled',
            jsonb_build_object(
                'execution_id', v_execution_id,
                'message', 'Auto-claim is disabled in settings'
            ),
            v_now_utc
        );

        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Auto-claim is disabled',
            'execution_id', v_execution_id
        );
    END IF;

    -- Get schedule settings
    v_utc_hour := COALESCE((v_config->'schedule'->>'utc_hour')::INTEGER, 13);

    -- Get backfill settings
    v_backfill_enabled := COALESCE((v_config->'backfill'->>'enabled')::BOOLEAN, TRUE);
    v_backfill_days := COALESCE((v_config->'backfill'->>'days_to_check')::INTEGER, 7);

    -- Calculate today's cutoff
    v_today_cutoff := DATE_TRUNC('day', v_now_utc) + (v_utc_hour || ' hours')::INTERVAL;

    -- Get day of week (0 = Sunday, 6 = Saturday in UTC)
    v_day_of_week := EXTRACT(DOW FROM v_now_utc)::INTEGER;
    v_is_weekday := (v_day_of_week >= 1 AND v_day_of_week <= 5);

    -- =====================================================
    -- PHASE 1: Process Today's Claims
    -- =====================================================

    FOR v_user IN
        SELECT id, subscription_plan
        FROM users
        WHERE subscription_status = 'active'
          AND lead_access = true
          AND subscription_plan IS NOT NULL
    LOOP
        BEGIN
            -- Get plan configuration
            v_plan_config := v_config->'plans'->v_user.subscription_plan;

            IF v_plan_config IS NULL THEN
                CONTINUE;
            END IF;

            v_expected_dollar := COALESCE((v_plan_config->>'dollar_leads')::INTEGER, 0);
            v_expected_diamond := COALESCE((v_plan_config->>'diamond_leads')::INTEGER, 0);

            -- ===== DOLLAR LEADS =====
            IF v_expected_dollar > 0 THEN
                -- Check weekday restriction
                IF COALESCE((v_plan_config->>'weekdays_only')::BOOLEAN, FALSE) AND NOT v_is_weekday THEN
                    -- Skip on weekends
                    CONTINUE;
                END IF;

                -- Find existing claim for today
                SELECT id, lead_count INTO v_existing_claim
                FROM user_claims
                WHERE user_id = v_user.id
                  AND type = 'dollar-lead'
                  AND claimed_at >= v_today_cutoff
                ORDER BY claimed_at DESC
                LIMIT 1;

                IF v_existing_claim.id IS NULL THEN
                    -- No claim yet → create new claim
                    v_claim_id := create_user_claim(v_user.id, 'dollar-lead', v_expected_dollar);
                    v_claims_created := v_claims_created + 1;
                ELSE
                    -- Claim exists → check for shortfall
                    v_shortfall := v_expected_dollar - v_existing_claim.lead_count;

                    IF v_shortfall > 0 THEN
                        -- Add missing leads to existing claim
                        v_leads_added := add_leads_to_claim(v_existing_claim.id, v_shortfall);

                        IF v_leads_added > 0 THEN
                            v_claims_filled := v_claims_filled + 1;

                            -- Log the gap fill
                            INSERT INTO system_logs (event_type, event_data, created_at)
                            VALUES (
                                'auto_claim_shortfall_filled',
                                jsonb_build_object(
                                    'execution_id', v_execution_id,
                                    'user_id', v_user.id,
                                    'claim_id', v_existing_claim.id,
                                    'type', 'dollar-lead',
                                    'expected', v_expected_dollar,
                                    'had', v_existing_claim.lead_count,
                                    'shortfall', v_shortfall,
                                    'added', v_leads_added,
                                    'date', CURRENT_DATE
                                ),
                                v_now_utc
                            );
                        END IF;
                    END IF;
                END IF;
            END IF;

            -- ===== DIAMOND LEADS =====
            IF v_expected_diamond > 0 THEN
                -- Find existing claim for today
                SELECT id, lead_count INTO v_existing_claim
                FROM user_claims
                WHERE user_id = v_user.id
                  AND type = 'diamond-lead'
                  AND claimed_at >= v_today_cutoff
                ORDER BY claimed_at DESC
                LIMIT 1;

                IF v_existing_claim.id IS NULL THEN
                    -- No claim yet → create new claim
                    v_claim_id := create_user_claim(v_user.id, 'diamond-lead', v_expected_diamond);
                    v_claims_created := v_claims_created + 1;
                ELSE
                    -- Claim exists → check for shortfall
                    v_shortfall := v_expected_diamond - v_existing_claim.lead_count;

                    IF v_shortfall > 0 THEN
                        -- Add missing leads to existing claim
                        v_leads_added := add_leads_to_claim(v_existing_claim.id, v_shortfall);

                        IF v_leads_added > 0 THEN
                            v_claims_filled := v_claims_filled + 1;

                            -- Log the gap fill
                            INSERT INTO system_logs (event_type, event_data, created_at)
                            VALUES (
                                'auto_claim_shortfall_filled',
                                jsonb_build_object(
                                    'execution_id', v_execution_id,
                                    'user_id', v_user.id,
                                    'claim_id', v_existing_claim.id,
                                    'type', 'diamond-lead',
                                    'expected', v_expected_diamond,
                                    'had', v_existing_claim.lead_count,
                                    'shortfall', v_shortfall,
                                    'added', v_leads_added,
                                    'date', CURRENT_DATE
                                ),
                                v_now_utc
                            );
                        END IF;
                    END IF;
                END IF;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            INSERT INTO system_logs (event_type, event_data, created_at)
            VALUES (
                'auto_claim_error',
                jsonb_build_object(
                    'execution_id', v_execution_id,
                    'user_id', v_user.id,
                    'error', SQLERRM,
                    'phase', 'today_claims'
                ),
                v_now_utc
            );
        END;
    END LOOP;

    -- =====================================================
    -- PHASE 2: Backfill Last 7 Days
    -- =====================================================

    IF v_backfill_enabled THEN
        INSERT INTO system_logs (event_type, event_data, created_at)
        VALUES (
            'auto_backfill_started',
            jsonb_build_object(
                'execution_id', v_execution_id,
                'days_to_check', v_backfill_days,
                'start_date', CURRENT_DATE - v_backfill_days,
                'end_date', CURRENT_DATE - 1
            ),
            v_now_utc
        );

        -- Loop through past days (excluding today)
        FOR v_target_date IN
            SELECT generate_series(
                CURRENT_DATE - v_backfill_days,
                CURRENT_DATE - 1,
                '1 day'::INTERVAL
            )::DATE
        LOOP
            v_date_cutoff_start := DATE_TRUNC('day', v_target_date::TIMESTAMPTZ) + (v_utc_hour || ' hours')::INTERVAL;
            v_date_cutoff_end := v_date_cutoff_start + INTERVAL '24 hours';
            v_backfill_dates_processed := v_backfill_dates_processed + 1;

            FOR v_user IN
                SELECT id, subscription_plan
                FROM users
                WHERE subscription_status = 'active'
                  AND lead_access = true
                  AND subscription_plan IS NOT NULL
            LOOP
                BEGIN
                    -- Get plan configuration
                    v_plan_config := v_config->'plans'->v_user.subscription_plan;

                    IF v_plan_config IS NULL THEN
                        CONTINUE;
                    END IF;

                    v_expected_dollar := COALESCE((v_plan_config->>'dollar_leads')::INTEGER, 0);
                    v_expected_diamond := COALESCE((v_plan_config->>'diamond_leads')::INTEGER, 0);

                    -- Check weekday restriction for that date
                    v_day_of_week := EXTRACT(DOW FROM v_target_date)::INTEGER;
                    v_is_weekday := (v_day_of_week >= 1 AND v_day_of_week <= 5);

                    -- ===== DOLLAR LEADS BACKFILL =====
                    IF v_expected_dollar > 0 THEN
                        -- Skip weekends if required
                        IF COALESCE((v_plan_config->>'weekdays_only')::BOOLEAN, FALSE) AND NOT v_is_weekday THEN
                            CONTINUE;
                        END IF;

                        -- Find existing claim for that date
                        SELECT id, lead_count INTO v_existing_claim
                        FROM user_claims
                        WHERE user_id = v_user.id
                          AND type = 'dollar-lead'
                          AND claimed_at >= v_date_cutoff_start
                          AND claimed_at < v_date_cutoff_end
                        ORDER BY claimed_at DESC
                        LIMIT 1;

                        IF v_existing_claim.id IS NULL THEN
                            -- No claim for that date → create backfill claim
                            v_claim_id := create_user_claim(v_user.id, 'dollar-lead', v_expected_dollar);

                            -- Update claimed_at to that date's cutoff
                            UPDATE user_claims
                            SET claimed_at = v_date_cutoff_start
                            WHERE id = v_claim_id;

                            v_backfill_claims_filled := v_backfill_claims_filled + 1;
                        ELSE
                            -- Claim exists → fill shortfall
                            v_shortfall := v_expected_dollar - v_existing_claim.lead_count;

                            IF v_shortfall > 0 THEN
                                v_leads_added := add_leads_to_claim(v_existing_claim.id, v_shortfall);

                                IF v_leads_added > 0 THEN
                                    v_backfill_claims_filled := v_backfill_claims_filled + 1;

                                    -- Log backfill
                                    INSERT INTO system_logs (event_type, event_data, created_at)
                                    VALUES (
                                        'auto_backfill_filled',
                                        jsonb_build_object(
                                            'execution_id', v_execution_id,
                                            'target_date', v_target_date,
                                            'user_id', v_user.id,
                                            'claim_id', v_existing_claim.id,
                                            'type', 'dollar-lead',
                                            'expected', v_expected_dollar,
                                            'had', v_existing_claim.lead_count,
                                            'shortfall', v_shortfall,
                                            'added', v_leads_added
                                        ),
                                        v_now_utc
                                    );
                                END IF;
                            END IF;
                        END IF;
                    END IF;

                    -- ===== DIAMOND LEADS BACKFILL =====
                    IF v_expected_diamond > 0 THEN
                        -- Find existing claim for that date
                        SELECT id, lead_count INTO v_existing_claim
                        FROM user_claims
                        WHERE user_id = v_user.id
                          AND type = 'diamond-lead'
                          AND claimed_at >= v_date_cutoff_start
                          AND claimed_at < v_date_cutoff_end
                        ORDER BY claimed_at DESC
                        LIMIT 1;

                        IF v_existing_claim.id IS NULL THEN
                            -- No claim for that date → create backfill claim
                            v_claim_id := create_user_claim(v_user.id, 'diamond-lead', v_expected_diamond);

                            -- Update claimed_at to that date's cutoff
                            UPDATE user_claims
                            SET claimed_at = v_date_cutoff_start
                            WHERE id = v_claim_id;

                            v_backfill_claims_filled := v_backfill_claims_filled + 1;
                        ELSE
                            -- Claim exists → fill shortfall
                            v_shortfall := v_expected_diamond - v_existing_claim.lead_count;

                            IF v_shortfall > 0 THEN
                                v_leads_added := add_leads_to_claim(v_existing_claim.id, v_shortfall);

                                IF v_leads_added > 0 THEN
                                    v_backfill_claims_filled := v_backfill_claims_filled + 1;

                                    -- Log backfill
                                    INSERT INTO system_logs (event_type, event_data, created_at)
                                    VALUES (
                                        'auto_backfill_filled',
                                        jsonb_build_object(
                                            'execution_id', v_execution_id,
                                            'target_date', v_target_date,
                                            'user_id', v_user.id,
                                            'claim_id', v_existing_claim.id,
                                            'type', 'diamond-lead',
                                            'expected', v_expected_diamond,
                                            'had', v_existing_claim.lead_count,
                                            'shortfall', v_shortfall,
                                            'added', v_leads_added
                                        ),
                                        v_now_utc
                                    );
                                END IF;
                            END IF;
                        END IF;
                    END IF;

                EXCEPTION WHEN OTHERS THEN
                    v_errors := v_errors + 1;
                    INSERT INTO system_logs (event_type, event_data, created_at)
                    VALUES (
                        'auto_backfill_error',
                        jsonb_build_object(
                            'execution_id', v_execution_id,
                            'target_date', v_target_date,
                            'user_id', v_user.id,
                            'error', SQLERRM
                        ),
                        v_now_utc
                    );
                END;
            END LOOP;
        END LOOP;

        INSERT INTO system_logs (event_type, event_data, created_at)
        VALUES (
            'auto_backfill_completed',
            jsonb_build_object(
                'execution_id', v_execution_id,
                'dates_processed', v_backfill_dates_processed,
                'claims_filled', v_backfill_claims_filled
            ),
            v_now_utc
        );
    END IF;

    -- =====================================================
    -- Final Summary
    -- =====================================================

    INSERT INTO system_logs (event_type, event_data, created_at)
    VALUES (
        'auto_claim_execution',
        jsonb_build_object(
            'execution_id', v_execution_id,
            'duration_seconds', EXTRACT(EPOCH FROM (NOW() AT TIME ZONE 'UTC' - v_start_time)),
            'today_claims_created', v_claims_created,
            'today_claims_filled', v_claims_filled,
            'backfill_enabled', v_backfill_enabled,
            'backfill_dates_processed', v_backfill_dates_processed,
            'backfill_claims_filled', v_backfill_claims_filled,
            'errors', v_errors
        ),
        v_now_utc
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'execution_id', v_execution_id,
        'today', jsonb_build_object(
            'claims_created', v_claims_created,
            'claims_filled', v_claims_filled
        ),
        'backfill', jsonb_build_object(
            'enabled', v_backfill_enabled,
            'dates_processed', v_backfill_dates_processed,
            'claims_filled', v_backfill_claims_filled
        ),
        'errors', v_errors,
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() AT TIME ZONE 'UTC' - v_start_time))
    );
END;
$$;

COMMENT ON FUNCTION auto_create_daily_claims IS 'Creates daily claims for active users, fills shortfalls, and backfills past 7 days';

-- =====================================================
-- Update default settings to include backfill config
-- =====================================================

DO $$
DECLARE
    v_current_config JSONB;
BEGIN
    -- Get current auto-claim config
    SELECT config INTO v_current_config
    FROM settings
    WHERE type = 'auto-claim';

    IF v_current_config IS NOT NULL THEN
        -- Add backfill configuration if not exists
        IF v_current_config->'backfill' IS NULL THEN
            UPDATE settings
            SET config = config || jsonb_build_object(
                'backfill', jsonb_build_object(
                    'enabled', true,
                    'days_to_check', 7,
                    'fill_shortfalls', true
                )
            )
            WHERE type = 'auto-claim';

            RAISE NOTICE 'Added backfill configuration to auto-claim settings';
        END IF;
    END IF;
END $$;
