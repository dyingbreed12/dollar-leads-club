-- =====================================================
-- Migration: Fix Cronjob Trigger Permissions
-- =====================================================
-- This migration fixes the permission error when updating auto-claim settings.
--
-- Problem:
-- The trigger function auto_update_cronjob_schedule() was created without
-- SECURITY DEFINER, causing it to execute with the caller's privileges
-- instead of the definer's (postgres) privileges. This results in:
-- ERROR: permission denied for schema cron (error code 42501)
--
-- Solution:
-- Add SECURITY DEFINER to the function so it executes with postgres
-- superuser privileges, allowing it to access the cron schema and
-- call cron.schedule() / cron.unschedule() functions.
--
-- =====================================================

-- Drop existing trigger first (must drop before dropping function)
DROP TRIGGER IF EXISTS trigger_auto_update_cronjob ON settings;

-- Drop and recreate the function with SECURITY DEFINER
DROP FUNCTION IF EXISTS auto_update_cronjob_schedule();

CREATE OR REPLACE FUNCTION auto_update_cronjob_schedule()
RETURNS TRIGGER
SECURITY DEFINER  -- Execute with definer's privileges (postgres role)
SET search_path = public, cron  -- Explicit search path for security
AS $$
DECLARE
    v_utc_hour INTEGER;
    v_minute INTEGER;
    v_cron_expression TEXT;
    v_old_schedule TEXT;
    v_enabled BOOLEAN;
BEGIN
    -- Only process auto-claim settings
    IF NEW.type != 'auto-claim' THEN
        RETURN NEW;
    END IF;

    -- Extract schedule configuration from new settings
    v_utc_hour := (NEW.config->'schedule'->>'utc_hour')::INTEGER;
    v_minute := COALESCE((NEW.config->'schedule'->>'minute')::INTEGER, 0);
    v_enabled := COALESCE((NEW.config->>'enabled')::BOOLEAN, TRUE);

    -- Validate UTC hour (0-23)
    IF v_utc_hour IS NULL OR v_utc_hour < 0 OR v_utc_hour > 23 THEN
        RAISE WARNING 'Invalid utc_hour: %. Cronjob schedule not updated. Valid range: 0-23', v_utc_hour;

        -- Log the error
        INSERT INTO system_logs (event_type, event_data)
        VALUES ('cronjob_schedule_update_error', jsonb_build_object(
            'error', 'Invalid UTC hour',
            'utc_hour', v_utc_hour,
            'valid_range', '0-23',
            'updated_by', NEW.updated_by,
            'attempted_at', NOW()
        ));

        RETURN NEW;
    END IF;

    -- Validate minute (0-59)
    IF v_minute < 0 OR v_minute > 59 THEN
        RAISE WARNING 'Invalid minute: %. Cronjob schedule not updated. Valid range: 0-59', v_minute;

        INSERT INTO system_logs (event_type, event_data)
        VALUES ('cronjob_schedule_update_error', jsonb_build_object(
            'error', 'Invalid minute',
            'minute', v_minute,
            'valid_range', '0-59',
            'updated_by', NEW.updated_by,
            'attempted_at', NOW()
        ));

        RETURN NEW;
    END IF;

    -- Build cron expression: "minute hour * * *"
    v_cron_expression := format('%s %s * * *', v_minute, v_utc_hour);

    -- Get current cronjob schedule for logging (before change)
    SELECT schedule INTO v_old_schedule
    FROM cron.job
    WHERE jobname = 'auto-create-daily-claims';

    -- Unschedule old cronjob (safe even if doesn't exist)
    PERFORM cron.unschedule('auto-create-daily-claims');

    -- Schedule new cronjob with updated time
    PERFORM cron.schedule(
        'auto-create-daily-claims',
        v_cron_expression,
        $cmd$SELECT auto_create_daily_claims();$cmd$
    );

    -- Log the successful schedule update
    INSERT INTO system_logs (event_type, event_data)
    VALUES ('cronjob_schedule_updated', jsonb_build_object(
        'old_schedule', v_old_schedule,
        'new_schedule', v_cron_expression,
        'utc_hour', v_utc_hour,
        'minute', v_minute,
        'enabled', v_enabled,
        'timezone', NEW.config->'schedule'->>'timezone',
        'local_hour', NEW.config->'schedule'->>'hour',
        'updated_by', NEW.updated_by,
        'updated_at', NOW()
    ));

    RAISE NOTICE 'Cronjob schedule updated: % -> %', v_old_schedule, v_cron_expression;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_update_cronjob_schedule IS
'Automatically reschedules the auto_create_daily_claims cronjob when schedule settings are updated. Executes with SECURITY DEFINER to access cron schema. Validates input and logs all changes.';

-- Recreate the trigger
CREATE TRIGGER trigger_auto_update_cronjob
AFTER UPDATE ON settings
FOR EACH ROW
WHEN (
    NEW.type = 'auto-claim'
    AND (
        -- Trigger only when schedule hour or minute actually changed
        OLD.config->'schedule'->>'utc_hour' IS DISTINCT FROM NEW.config->'schedule'->>'utc_hour'
        OR OLD.config->'schedule'->>'minute' IS DISTINCT FROM NEW.config->'schedule'->>'minute'
    )
)
EXECUTE FUNCTION auto_update_cronjob_schedule();

COMMENT ON TRIGGER trigger_auto_update_cronjob ON settings IS
'Automatically updates the pg_cron job schedule when auto-claim schedule settings change';

-- =====================================================
-- Verification
-- =====================================================
-- After this migration, admins can update the auto-claim schedule
-- in the settings UI and the cronjob will automatically reschedule
-- without permission errors.
--
-- To verify:
-- SELECT proname, prosecdef FROM pg_proc WHERE proname = 'auto_update_cronjob_schedule';
-- Should show: prosecdef = true (SECURITY DEFINER enabled)
-- =====================================================
