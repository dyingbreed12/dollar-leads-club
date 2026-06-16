-- Migration: Create Settings Table and Auto Daily Claims System
-- Description: Unified migration for settings configuration and automated lead claiming
-- Created: 2025-11-16
--
-- This migration creates:
-- 1. System logs table for tracking events
-- 2. Settings table for dynamic configuration
-- 3. Helper functions for settings management
-- 4. Auto-claim functions with dynamic configuration support
-- 5. Analytical views for monitoring
-- 6. pg_cron job for scheduled execution

-- =====================================================
-- 1. CREATE SYSTEM_LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add index for faster querying by event type and date
CREATE INDEX IF NOT EXISTS idx_system_logs_event_type ON system_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);

-- =====================================================
-- 2. CREATE SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL UNIQUE,  -- 'auto-claim', 'email', 'stripe', etc.
    config JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups by type
CREATE INDEX IF NOT EXISTS idx_settings_type ON settings(type);

-- =====================================================
-- 3. INSERT DEFAULT AUTO-CLAIM CONFIGURATION
-- =====================================================
INSERT INTO settings (type, config, description)
VALUES (
    'auto-claim',
    '{
        "enabled": true,
        "schedule": {
            "hour": 8,
            "minute": 0,
            "timezone": "America/New_York",
            "utc_hour": 13
        },
        "plans": {
            "dollar-lead": {
                "dollar_leads": 5,
                "diamond_leads": 0,
                "weekdays_only": true,
                "description": "Dollar plan users receive 5 dollar-leads on weekdays only"
            },
            "diamond-lead": {
                "dollar_leads": 10,
                "diamond_leads": 2,
                "weekdays_only": false,
                "description": "Diamond plan users receive 2 diamond-leads + 10 dollar-leads daily"
            }
        },
        "notifications": {
            "send_email": false,
            "email_api_url": null,
            "include_csv_attachment": false
        },
        "logging": {
            "log_executions": true,
            "log_errors": true,
            "log_insufficient_leads": true
        }
    }'::jsonb,
    'Configuration for automatic daily lead claims. Controls schedule, lead counts per plan, and notification settings.'
)
ON CONFLICT (type) DO NOTHING;

-- =====================================================
-- 4. SETTINGS HELPER FUNCTIONS
-- =====================================================

-- Retrieves a setting by type, returns NULL if not found
CREATE OR REPLACE FUNCTION get_setting(p_type TEXT)
RETURNS JSONB AS $$
BEGIN
    RETURN (
        SELECT config
        FROM settings
        WHERE type = p_type
    );
END;
$$ LANGUAGE plpgsql;

-- Updates a setting config and returns the updated config
CREATE OR REPLACE FUNCTION update_setting(
    p_type TEXT,
    p_config JSONB,
    p_updated_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    UPDATE settings
    SET config = p_config,
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE type = p_type
    RETURNING config INTO v_result;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'Setting type % not found', p_type;
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Merges new config into existing config (partial updates)
CREATE OR REPLACE FUNCTION merge_setting(
    p_type TEXT,
    p_partial_config JSONB,
    p_updated_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_current_config JSONB;
    v_merged_config JSONB;
BEGIN
    -- Get current config
    SELECT config INTO v_current_config
    FROM settings
    WHERE type = p_type;

    IF v_current_config IS NULL THEN
        RAISE EXCEPTION 'Setting type % not found', p_type;
    END IF;

    -- Merge configs (deep merge)
    v_merged_config := v_current_config || p_partial_config;

    -- Update with merged config
    UPDATE settings
    SET config = v_merged_config,
        updated_by = p_updated_by,
        updated_at = NOW()
    WHERE type = p_type;

    RETURN v_merged_config;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. HELPER FUNCTION: can_user_claim_today
-- =====================================================
-- Checks if a user can claim leads of a specific type today
-- Uses 8 AM cutoff time - users can claim once per day after 8 AM
CREATE OR REPLACE FUNCTION can_user_claim_today(
    p_user_id UUID,
    p_lead_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_last_claim TIMESTAMPTZ;
    v_cutoff_time TIMESTAMPTZ;
    v_user_eligible BOOLEAN;
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

    -- Calculate today's 8 AM cutoff time
    v_cutoff_time := DATE_TRUNC('day', NOW()) + INTERVAL '8 hours';

    -- If current time is before 8 AM, use yesterday's 8 AM
    IF NOW() < v_cutoff_time THEN
        v_cutoff_time := v_cutoff_time - INTERVAL '1 day';
    END IF;

    -- User can claim if last claim was before the cutoff
    RETURN v_last_claim < v_cutoff_time;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. UTILITY FUNCTION: get_available_lead_count
-- =====================================================
CREATE OR REPLACE FUNCTION get_available_lead_count(
    p_type TEXT
) RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM leads
        WHERE type = p_type AND status = 'available'
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. UTILITY FUNCTION: calculate_inventory_days
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_inventory_days(
    p_type TEXT
) RETURNS NUMERIC AS $$
DECLARE
    v_available_leads INTEGER;
    v_daily_requirement INTEGER;
    v_diamond_count INTEGER;
    v_dollar_count INTEGER;
BEGIN
    -- Get available leads
    v_available_leads := get_available_lead_count(p_type);

    -- Get active member counts by subscription plan
    SELECT
        COUNT(*) FILTER (WHERE subscription_plan = 'diamond-lead'),
        COUNT(*) FILTER (WHERE subscription_plan = 'dollar-lead')
    INTO v_diamond_count, v_dollar_count
    FROM users
    WHERE subscription_status = 'active'
      AND lead_access = true;

    -- Calculate daily requirement based on lead type
    IF p_type = 'diamond-lead' THEN
        -- Only Diamond users get diamond-leads (2 per day)
        v_daily_requirement := v_diamond_count * 2;
    ELSE  -- dollar-lead
        -- Diamond users get 10 dollar-leads daily
        -- Dollar users get 5 dollar-leads weekdays only (~3.57/day average)
        v_daily_requirement := (v_diamond_count * 10) + (v_dollar_count * 5 * 5 / 7);
    END IF;

    -- Avoid division by zero
    IF v_daily_requirement = 0 THEN
        RETURN NULL;
    END IF;

    -- Return days of inventory
    RETURN v_available_leads::NUMERIC / v_daily_requirement::NUMERIC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. UTILITY FUNCTION: check_duplicate_lead
-- =====================================================
CREATE OR REPLACE FUNCTION check_duplicate_lead(
    p_address TEXT,
    p_months INTEGER DEFAULT 6
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM leads
        WHERE street_address = p_address
          AND created_at >= NOW() - (p_months || ' months')::INTERVAL
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. HELPER FUNCTION: create_user_claim
-- =====================================================
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

    -- Create the claim record
    INSERT INTO user_claims (user_id, type, lead_count, claimed_at)
    VALUES (p_user_id, p_type, p_lead_count, NOW())
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


-- =====================================================
-- 10. MAIN FUNCTION: auto_create_daily_claims
-- =====================================================
-- Dynamic version that reads configuration from settings table
CREATE OR REPLACE FUNCTION auto_create_daily_claims()
RETURNS JSON AS $$
DECLARE
    v_user RECORD;
    v_claim_id UUID;
    v_stats JSON;
    v_config JSONB;
    v_plan_config JSONB;
    v_diamond_lead_claims INTEGER := 0;
    v_diamond_dollar_claims INTEGER := 0;
    v_dollar_claims INTEGER := 0;
    v_errors INTEGER := 0;
    v_skipped INTEGER := 0;
    v_dollar_leads_count INTEGER;
    v_diamond_leads_count INTEGER;
    v_weekdays_only BOOLEAN;
    v_current_dow INTEGER;
    v_is_weekday BOOLEAN;
BEGIN
    -- Get auto-claim configuration
    v_config := get_setting('auto-claim');

    -- Check if auto-claim is enabled
    IF v_config IS NULL OR (v_config->>'enabled')::BOOLEAN = FALSE THEN
        INSERT INTO system_logs (event_type, event_data)
        VALUES ('auto_claim_disabled', jsonb_build_object(
            'message', 'Auto-claim is disabled or config not found',
            'executed_at', NOW()
        ));

        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Auto-claim is disabled',
            'executed_at', NOW()
        );
    END IF;

    -- Get current day of week (0 = Sunday, 1 = Monday, ... 6 = Saturday)
    v_current_dow := EXTRACT(DOW FROM NOW())::INTEGER;
    v_is_weekday := v_current_dow BETWEEN 1 AND 5;

    -- Loop through all active users with lead access
    FOR v_user IN
        SELECT id, subscription_plan, email, name
        FROM users
        WHERE subscription_status = 'active'
          AND lead_access = true
          AND subscription_plan IS NOT NULL
    LOOP
        BEGIN
            -- Get plan-specific configuration
            v_plan_config := v_config->'plans'->v_user.subscription_plan;

            IF v_plan_config IS NULL THEN
                -- Skip users with unknown plans
                v_skipped := v_skipped + 1;
                CONTINUE;
            END IF;

            -- Extract lead counts from config
            v_dollar_leads_count := COALESCE((v_plan_config->>'dollar_leads')::INTEGER, 0);
            v_diamond_leads_count := COALESCE((v_plan_config->>'diamond_leads')::INTEGER, 0);
            v_weekdays_only := COALESCE((v_plan_config->>'weekdays_only')::BOOLEAN, FALSE);

            -- Check weekday restriction
            IF v_weekdays_only AND NOT v_is_weekday THEN
                v_skipped := v_skipped + 1;
                CONTINUE;
            END IF;

            -- Create diamond-lead claims if configured
            IF v_diamond_leads_count > 0 THEN
                IF can_user_claim_today(v_user.id, 'diamond-lead') THEN
                    PERFORM create_user_claim(v_user.id, 'diamond-lead', v_diamond_leads_count);
                    v_diamond_lead_claims := v_diamond_lead_claims + 1;
                END IF;
            END IF;

            -- Create dollar-lead claims if configured
            IF v_dollar_leads_count > 0 THEN
                IF can_user_claim_today(v_user.id, 'dollar-lead') THEN
                    PERFORM create_user_claim(v_user.id, 'dollar-lead', v_dollar_leads_count);

                    -- Track which type of user made the claim
                    IF v_user.subscription_plan = 'diamond-lead' THEN
                        v_diamond_dollar_claims := v_diamond_dollar_claims + 1;
                    ELSE
                        v_dollar_claims := v_dollar_claims + 1;
                    END IF;
                END IF;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;

            -- Log error if enabled
            IF COALESCE((v_config->'logging'->>'log_errors')::BOOLEAN, TRUE) THEN
                INSERT INTO system_logs (event_type, event_data)
                VALUES ('auto_claim_error', jsonb_build_object(
                    'user_id', v_user.id,
                    'user_email', v_user.email,
                    'subscription_plan', v_user.subscription_plan,
                    'error', SQLERRM,
                    'error_detail', SQLSTATE
                ));
            END IF;
        END;
    END LOOP;

    -- Build statistics
    v_stats := jsonb_build_object(
        'diamond_lead_claims', v_diamond_lead_claims,
        'diamond_dollar_claims', v_diamond_dollar_claims,
        'dollar_claims', v_dollar_claims,
        'total_claims', v_diamond_lead_claims + v_diamond_dollar_claims + v_dollar_claims,
        'skipped', v_skipped,
        'errors', v_errors,
        'executed_at', NOW(),
        'day_of_week', v_current_dow,
        'is_weekday', v_is_weekday,
        'config_used', v_config->'plans'
    );

    -- Log execution if enabled
    IF COALESCE((v_config->'logging'->>'log_executions')::BOOLEAN, TRUE) THEN
        INSERT INTO system_logs (event_type, event_data)
        VALUES ('auto_claim_execution', v_stats);
    END IF;

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. ANALYTICAL VIEWS
-- =====================================================

-- View: Active Members Summary
CREATE OR REPLACE VIEW active_members_summary AS
SELECT
    subscription_plan,
    COUNT(*) as member_count,
    COUNT(*) FILTER (WHERE subscription_status = 'active') as active_count,
    COUNT(*) FILTER (WHERE subscription_status = 'past_due') as past_due_count,
    COUNT(*) FILTER (WHERE subscription_status = 'canceled') as canceled_count,
    COUNT(*) FILTER (WHERE lead_access = true) as lead_access_count
FROM users
WHERE subscription_plan IS NOT NULL
GROUP BY subscription_plan;

-- View: Inventory Status Dashboard
CREATE OR REPLACE VIEW inventory_status AS
SELECT
    type as lead_type,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE status = 'available') as available_leads,
    COUNT(*) FILTER (WHERE status = 'claimed') as claimed_leads,
    COUNT(*) FILTER (WHERE status = 'expired') as expired_leads,
    calculate_inventory_days(type) as days_remaining
FROM leads
GROUP BY type;

-- View: User Claim History
CREATE OR REPLACE VIEW user_claim_history AS
SELECT
    uc.id as claim_id,
    uc.user_id,
    u.email,
    u.name,
    u.subscription_plan,
    uc.type,
    uc.lead_count,
    uc.claimed_at,
    uc.viewed,
    uc.viewed_at,
    uc.downloaded,
    uc.downloaded_at,
    uc.created_at,
    uc.updated_at
FROM user_claims uc
JOIN users u ON uc.user_id = u.id
ORDER BY uc.claimed_at DESC;

-- View: Daily Claims Report
CREATE OR REPLACE VIEW daily_claims_report AS
SELECT
    DATE(claimed_at) as claim_date,
    type,
    COUNT(DISTINCT user_id) as users_claimed,
    SUM(lead_count) as total_leads_claimed,
    COUNT(*) FILTER (WHERE viewed = TRUE) as claims_viewed,
    COUNT(*) FILTER (WHERE downloaded = TRUE) as claims_downloaded,
    COUNT(*) as total_claims
FROM user_claims
WHERE claimed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(claimed_at), type
ORDER BY claim_date DESC, type;

-- =====================================================
-- 12. ENABLE PG_CRON EXTENSION
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- =====================================================
-- 13. SCHEDULE THE DAILY CLAIMS JOB
-- =====================================================
-- Schedule: Every day at 8:00 AM EST (1:00 PM UTC)
SELECT cron.schedule(
    'auto-create-daily-claims',
    '0 13 * * *',
    $$SELECT auto_create_daily_claims();$$
);

-- =====================================================
-- 14. MANUAL TRIGGER FUNCTION: process_missing_claims
-- =====================================================
-- Processes missing or incomplete claims for a specific date
-- Useful when leads were insufficient and admin uploads more leads
-- Can fill gaps for users who got partial or no allocation
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

    -- Calculate the claim window for target date (8 AM to next day 8 AM)
    v_cutoff_start := p_target_date + INTERVAL '8 hours';
    v_cutoff_end := p_target_date + INTERVAL '1 day' + INTERVAL '8 hours';

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
            SELECT
                COALESCE(SUM(CASE WHEN type = 'dollar-lead' THEN lead_count ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN type = 'diamond-lead' THEN lead_count ELSE 0 END), 0)
            INTO v_dollar_leads_received, v_diamond_leads_received
            FROM user_claims
            WHERE user_id = v_user.id
              AND claimed_at >= v_cutoff_start
              AND claimed_at < v_cutoff_end;

            -- Calculate shortfall
            v_dollar_leads_needed := GREATEST(0, v_dollar_leads_expected - v_dollar_leads_received);
            v_diamond_leads_needed := GREATEST(0, v_diamond_leads_expected - v_diamond_leads_received);

            -- Create claims for missing diamond leads
            IF v_diamond_leads_needed > 0 THEN
                -- Assign whatever is available, even if less than needed
                v_diamond_available := get_available_lead_count('diamond-lead');
                IF v_diamond_available > 0 THEN
                    v_diamond_to_assign := LEAST(v_diamond_leads_needed, v_diamond_available);
                    PERFORM create_user_claim(v_user.id, 'diamond-lead', v_diamond_to_assign);
                    v_claims_created := v_claims_created + 1;
                    v_leads_distributed := v_leads_distributed + v_diamond_to_assign;
                END IF;
            END IF;

            -- Create claims for missing dollar leads
            IF v_dollar_leads_needed > 0 THEN
                -- Assign whatever is available, even if less than needed
                v_dollar_available := get_available_lead_count('dollar-lead');
                IF v_dollar_available > 0 THEN
                    v_dollar_to_assign := LEAST(v_dollar_leads_needed, v_dollar_available);
                    PERFORM create_user_claim(v_user.id, 'dollar-lead', v_dollar_to_assign);
                    v_claims_created := v_claims_created + 1;
                    v_leads_distributed := v_leads_distributed + v_dollar_to_assign;
                END IF;
            END IF;

            -- Skip count if user already has full allocation
            IF v_dollar_leads_needed = 0 AND v_diamond_leads_needed = 0 THEN
                v_users_skipped := v_users_skipped + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            INSERT INTO system_logs (event_type, event_data)
            VALUES ('manual_claim_error', jsonb_build_object(
                'user_id', v_user.id,
                'user_email', v_user.email,
                'target_date', p_target_date,
                'error', SQLERRM,
                'error_detail', SQLSTATE
            ));
        END;
    END LOOP;

    -- Build statistics
    v_stats := jsonb_build_object(
        'success', TRUE,
        'target_date', p_target_date,
        'claims_created', v_claims_created,
        'leads_distributed', v_leads_distributed,
        'users_processed', v_users_processed,
        'users_skipped', v_users_skipped,
        'users_filled', v_users_processed - v_users_skipped - v_errors,
        'errors', v_errors,
        'executed_at', NOW(),
        'is_target_weekday', v_is_target_weekday
    );

    -- Log execution
    INSERT INTO system_logs (event_type, event_data)
    VALUES ('manual_claim_execution', v_stats);

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_missing_claims IS 'Manually process missing or incomplete claims for a specific date. Fills gaps when leads were insufficient.';

-- =====================================================
-- 15. COMMENTS
-- =====================================================
COMMENT ON TABLE system_logs IS 'Logs for system events, auto-claim execution, and errors';
COMMENT ON TABLE settings IS 'Generic settings table for storing configurable application options';
COMMENT ON COLUMN settings.type IS 'Unique identifier for the setting type (e.g., auto-claim, email, stripe)';
COMMENT ON COLUMN settings.config IS 'JSON configuration data for the setting';

COMMENT ON FUNCTION get_setting IS 'Retrieves a setting configuration by type';
COMMENT ON FUNCTION update_setting IS 'Updates a setting configuration (full replacement)';
COMMENT ON FUNCTION merge_setting IS 'Merges partial configuration into existing setting (partial update)';
COMMENT ON FUNCTION can_user_claim_today IS 'Check if user can claim a specific lead type today (uses 8 AM cutoff)';
COMMENT ON FUNCTION get_available_lead_count IS 'Get count of available leads for a specific type';
COMMENT ON FUNCTION calculate_inventory_days IS 'Calculate days of inventory remaining for a lead type';
COMMENT ON FUNCTION check_duplicate_lead IS 'Check if a lead address was created recently (default 6 months)';
COMMENT ON FUNCTION create_user_claim IS 'Create a user claim and assign available leads';
COMMENT ON FUNCTION auto_create_daily_claims IS 'Auto-create daily claims using dynamic configuration from settings table';

COMMENT ON VIEW active_members_summary IS 'Summary of users by subscription plan and status';
COMMENT ON VIEW inventory_status IS 'Current lead inventory status by type';
COMMENT ON VIEW user_claim_history IS 'Complete claim history with user details';
COMMENT ON VIEW daily_claims_report IS '30-day rolling report of claims activity';

COMMENT ON EXTENSION pg_cron IS 'Cron-based job scheduler - schedules auto_create_daily_claims() at 8 AM EST daily';

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Get current auto-claim config:
-- SELECT get_setting('auto-claim');

-- Update lead count for dollar plan:
-- SELECT merge_setting(
--     'auto-claim',
--     '{"plans": {"dollar-lead": {"dollar_leads": 7}}}'::jsonb,
--     'admin-user-uuid'
-- );

-- Disable auto-claim:
-- SELECT merge_setting(
--     'auto-claim',
--     '{"enabled": false}'::jsonb,
--     'admin-user-uuid'
-- );

-- Test function manually:
-- SELECT auto_create_daily_claims();

-- View cron job:
-- SELECT * FROM cron.job WHERE jobname = 'auto-create-daily-claims';

-- View execution logs:
-- SELECT * FROM system_logs WHERE event_type = 'auto_claim_execution' ORDER BY created_at DESC;
