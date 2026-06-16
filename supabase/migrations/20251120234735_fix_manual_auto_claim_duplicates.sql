-- =====================================================
-- Fix Manual Auto-Claim Trigger to Update Existing Claims
-- =====================================================
-- This migration fixes the process_missing_claims() function to UPDATE
-- existing claims instead of creating duplicates for the same date.
--
-- Changes:
-- 1. Check if user already has a claim for the target date
-- 2. If exists with shortfall: use add_leads_to_claim() to UPDATE
-- 3. If exists with sufficient leads: skip user
-- 4. If doesn't exist: create new claim
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
                        -- CREATE new claim
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
                        -- CREATE new claim
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

COMMENT ON FUNCTION process_missing_claims IS 'Manual reconciliation that updates existing claims instead of creating duplicates';

-- =====================================================
-- Migration Notes
-- =====================================================
-- This function now:
-- 1. Checks for existing claims in the target date window
-- 2. Updates existing claims using add_leads_to_claim()
-- 3. Only creates new claims if none exist for the date
-- 4. Tracks both claims_created and claims_updated separately
-- 5. Prevents duplicate claims for the same user on the same date
-- =====================================================
