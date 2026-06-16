-- =====================================================
-- Fix Lead Count Accuracy in Auto-Claim System
-- =====================================================
-- This migration fixes bugs where:
-- 1. create_user_claim sets lead_count to REQUESTED amount, not ACTUAL assigned
-- 2. process_missing_claims uses SUM(lead_count) instead of counting actual linked leads
-- 3. Existing claims have incorrect lead_count values
-- =====================================================

-- =====================================================
-- STEP 1: Repair existing bad data FIRST
-- =====================================================
-- Update all user_claims.lead_count to match actual user_claim_leads count
-- This ensures existing claims reflect reality before we fix the functions

UPDATE user_claims uc
SET lead_count = COALESCE(
  (SELECT COUNT(*) FROM user_claim_leads ucl WHERE ucl.user_claim_id = uc.id),
  0
),
updated_at = NOW() AT TIME ZONE 'UTC';

-- Log how many claims were affected
DO $$
DECLARE
  v_claims_fixed INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_claims_fixed
  FROM user_claims uc
  WHERE uc.lead_count != COALESCE(
    (SELECT COUNT(*) FROM user_claim_leads ucl WHERE ucl.user_claim_id = uc.id),
    0
  );

  IF v_claims_fixed > 0 THEN
    INSERT INTO system_logs (event_type, event_data, created_at)
    VALUES (
      'migration_data_repair',
      jsonb_build_object(
        'migration', '20251204000000_fix_lead_count_accuracy',
        'claims_with_incorrect_count', v_claims_fixed,
        'action', 'Updated lead_count to match actual user_claim_leads count'
      ),
      NOW() AT TIME ZONE 'UTC'
    );
  END IF;
END $$;

-- =====================================================
-- STEP 2: Fix create_user_claim function
-- =====================================================
-- Changed: Insert with lead_count = 0, then update to actual assigned count

CREATE OR REPLACE FUNCTION create_user_claim(
    p_user_id UUID,
    p_type TEXT,
    p_lead_count INTEGER
) RETURNS UUID AS $$
DECLARE
    v_claim_id UUID;
    v_lead RECORD;
    v_assigned_count INTEGER := 0;
BEGIN
    -- Validate lead type
    IF p_type NOT IN ('dollar-lead', 'diamond-lead') THEN
        RAISE EXCEPTION 'Invalid lead type: %. Must be dollar-lead or diamond-lead', p_type;
    END IF;

    -- Validate lead count
    IF p_lead_count <= 0 THEN
        RAISE EXCEPTION 'Lead count must be greater than 0';
    END IF;

    -- Create the claim record with lead_count = 0 initially
    -- We'll update it after assigning leads to reflect actual count
    INSERT INTO user_claims (user_id, type, lead_count, claimed_at)
    VALUES (p_user_id, p_type, 0, NOW())  -- FIX: Start with 0, not p_lead_count
    RETURNING id INTO v_claim_id;

    -- Assign leads to this claim
    FOR v_lead IN
        SELECT id
        FROM leads
        WHERE type = p_type
          AND status = 'available'
        ORDER BY RANDOM()
        LIMIT p_lead_count
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Update lead status
        UPDATE leads
        SET status = 'claimed',
            claimed_by = p_user_id,
            claimed_at = NOW(),
            updated_at = NOW()
        WHERE id = v_lead.id;

        -- Link lead to claim
        INSERT INTO user_claim_leads (user_claim_id, lead_id)
        VALUES (v_claim_id, v_lead.id);

        v_assigned_count := v_assigned_count + 1;
    END LOOP;

    -- FIX: Update lead_count to reflect ACTUAL assigned leads
    UPDATE user_claims
    SET lead_count = v_assigned_count,
        updated_at = NOW()
    WHERE id = v_claim_id;

    -- Log if we couldn't assign enough leads
    IF v_assigned_count < p_lead_count THEN
        INSERT INTO system_logs (event_type, event_data)
        VALUES ('insufficient_leads', jsonb_build_object(
            'user_id', p_user_id,
            'type', p_type,
            'requested', p_lead_count,
            'assigned', v_assigned_count,
            'claim_id', v_claim_id
        ));
    END IF;

    RETURN v_claim_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_user_claim IS 'Creates a claim and assigns available leads. lead_count reflects ACTUAL assigned leads.';

-- =====================================================
-- STEP 3: Fix process_missing_claims function
-- =====================================================
-- Changed: Count actual linked leads instead of using SUM(lead_count)

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
    v_claims_updated INTEGER := 0;
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
    v_existing_claim RECORD;
    v_leads_added INTEGER;
    v_claim_id UUID;
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

            -- FIX: Count ACTUAL linked leads instead of using SUM(lead_count)
            -- Dollar leads - count from user_claim_leads junction table
            SELECT COALESCE(COUNT(ucl.id), 0)::INTEGER
            INTO v_dollar_leads_received
            FROM user_claims uc
            JOIN user_claim_leads ucl ON ucl.user_claim_id = uc.id
            WHERE uc.user_id = v_user.id
              AND uc.type = 'dollar-lead'
              AND uc.claimed_at >= v_cutoff_start
              AND uc.claimed_at < v_cutoff_end;

            -- Diamond leads - count from user_claim_leads junction table
            SELECT COALESCE(COUNT(ucl.id), 0)::INTEGER
            INTO v_diamond_leads_received
            FROM user_claims uc
            JOIN user_claim_leads ucl ON ucl.user_claim_id = uc.id
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

            -- Process diamond leads if needed and available
            IF v_diamond_leads_needed > 0 THEN
                v_diamond_to_assign := LEAST(v_diamond_leads_needed, v_diamond_available);

                IF v_diamond_to_assign > 0 THEN
                    -- Check if user already has a diamond-lead claim for this date
                    SELECT id, lead_count INTO v_existing_claim
                    FROM user_claims
                    WHERE user_id = v_user.id
                      AND type = 'diamond-lead'
                      AND claimed_at >= v_cutoff_start
                      AND claimed_at < v_cutoff_end
                    ORDER BY claimed_at DESC
                    LIMIT 1;

                    IF v_existing_claim.id IS NOT NULL THEN
                        -- UPDATE existing claim by adding more leads
                        v_leads_added := add_leads_to_claim(
                            v_existing_claim.id,
                            v_diamond_to_assign
                        );
                        v_claims_updated := v_claims_updated + 1;
                        v_leads_distributed := v_leads_distributed + v_leads_added;
                        v_diamond_available := v_diamond_available - v_leads_added;
                    ELSE
                        -- CREATE new claim and set claimed_at to target date
                        v_claim_id := create_user_claim(
                            v_user.id,
                            'diamond-lead',
                            v_diamond_to_assign
                        );
                        UPDATE user_claims SET claimed_at = v_cutoff_start WHERE id = v_claim_id;
                        v_claims_created := v_claims_created + 1;
                        v_leads_distributed := v_leads_distributed + v_diamond_to_assign;
                        v_diamond_available := v_diamond_available - v_diamond_to_assign;
                    END IF;
                END IF;
            END IF;

            -- Process dollar leads if needed and available
            IF v_dollar_leads_needed > 0 THEN
                v_dollar_to_assign := LEAST(v_dollar_leads_needed, v_dollar_available);

                IF v_dollar_to_assign > 0 THEN
                    -- Check if user already has a dollar-lead claim for this date
                    SELECT id, lead_count INTO v_existing_claim
                    FROM user_claims
                    WHERE user_id = v_user.id
                      AND type = 'dollar-lead'
                      AND claimed_at >= v_cutoff_start
                      AND claimed_at < v_cutoff_end
                    ORDER BY claimed_at DESC
                    LIMIT 1;

                    IF v_existing_claim.id IS NOT NULL THEN
                        -- UPDATE existing claim by adding more leads
                        v_leads_added := add_leads_to_claim(
                            v_existing_claim.id,
                            v_dollar_to_assign
                        );
                        v_claims_updated := v_claims_updated + 1;
                        v_leads_distributed := v_leads_distributed + v_leads_added;
                        v_dollar_available := v_dollar_available - v_leads_added;
                    ELSE
                        -- CREATE new claim and set claimed_at to target date
                        v_claim_id := create_user_claim(
                            v_user.id,
                            'dollar-lead',
                            v_dollar_to_assign
                        );
                        UPDATE user_claims SET claimed_at = v_cutoff_start WHERE id = v_claim_id;
                        v_claims_created := v_claims_created + 1;
                        v_leads_distributed := v_leads_distributed + v_dollar_to_assign;
                        v_dollar_available := v_dollar_available - v_dollar_to_assign;
                    END IF;
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
        'claims_updated', v_claims_updated,
        'leads_distributed', v_leads_distributed,
        'errors', v_errors,
        'executed_at', NOW()
    );

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_missing_claims IS 'Manual reconciliation that counts ACTUAL linked leads for accurate shortfall detection';

-- =====================================================
-- STEP 4: Also fix auto_create_daily_claims function
-- =====================================================
-- This function also needs to count actual linked leads

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
    v_actual_dollar INTEGER;
    v_actual_diamond INTEGER;
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
                    -- FIX: Count actual linked leads instead of using lead_count
                    SELECT COUNT(*) INTO v_actual_dollar
                    FROM user_claim_leads
                    WHERE user_claim_id = v_existing_claim.id;

                    v_shortfall := v_expected_dollar - v_actual_dollar;

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
                                    'had', v_actual_dollar,
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
                    -- FIX: Count actual linked leads instead of using lead_count
                    SELECT COUNT(*) INTO v_actual_diamond
                    FROM user_claim_leads
                    WHERE user_claim_id = v_existing_claim.id;

                    v_shortfall := v_expected_diamond - v_actual_diamond;

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
                                    'had', v_actual_diamond,
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
                            -- FIX: Count actual linked leads
                            SELECT COUNT(*) INTO v_actual_dollar
                            FROM user_claim_leads
                            WHERE user_claim_id = v_existing_claim.id;

                            v_shortfall := v_expected_dollar - v_actual_dollar;

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
                                            'had', v_actual_dollar,
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
                            -- FIX: Count actual linked leads
                            SELECT COUNT(*) INTO v_actual_diamond
                            FROM user_claim_leads
                            WHERE user_claim_id = v_existing_claim.id;

                            v_shortfall := v_expected_diamond - v_actual_diamond;

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
                                            'had', v_actual_diamond,
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

COMMENT ON FUNCTION auto_create_daily_claims IS 'Creates daily claims for active users, fills shortfalls by counting ACTUAL linked leads';

-- =====================================================
-- Migration Notes
-- =====================================================
-- This migration fixes a critical bug where:
-- 1. Claims were created with lead_count = requested amount, not actual
-- 2. Shortfall detection used lead_count instead of counting junction records
-- 3. Claims with 0 actual leads showed as having full leads
--
-- After this migration:
-- - lead_count accurately reflects actual linked leads
-- - Shortfall detection counts junction table records
-- - Existing bad data is repaired
-- =====================================================
