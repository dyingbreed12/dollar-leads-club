-- =====================================================
-- Migration: Auto-Update Cronjob Schedule on Settings Change
-- =====================================================
-- This migration implements automatic cronjob rescheduling when
-- admins change the auto-claim schedule configuration in settings.
--
-- Problem:
-- The pg_cron job schedule is hardcoded during initial migration.
-- When admins update the schedule hour in settings UI, the cronjob
-- continues to run at the old time, creating a disconnect between
-- the configured time and actual execution time.
--
-- Solution:
-- Create a PostgreSQL trigger that automatically:
-- 1. Detects when schedule config changes in settings table
-- 2. Extracts the new UTC hour and minute values
-- 3. Unschedules the old cronjob
-- 4. Schedules a new cronjob with the updated time
-- 5. Logs the change for audit purposes
--
-- Benefits:
-- - Automatic synchronization (no manual intervention)
-- - Atomic updates (same transaction as settings change)
-- - Works regardless of how settings are updated (UI, SQL, API)
-- - Audit trail of all schedule changes
-- =====================================================

-- =====================================================
-- 1. CREATE TRIGGER FUNCTION
-- =====================================================
-- Function that reschedules the cronjob when settings are updated
-- =====================================================
CREATE OR REPLACE FUNCTION auto_update_cronjob_schedule()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, cron
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
    -- Example: "0 15 * * *" = Run at 15:00 (3:00 PM) UTC every day
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
'Automatically reschedules the auto_create_daily_claims cronjob when schedule settings are updated. Validates input and logs all changes.';

-- =====================================================
-- 2. CREATE TRIGGER
-- =====================================================
-- Trigger that fires when settings table is updated
-- Only fires when auto-claim schedule actually changes
-- =====================================================
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
-- 3. INITIALIZE CRONJOB WITH CURRENT SETTINGS
-- =====================================================
-- Sync the cronjob schedule with current settings table
-- This ensures the cronjob matches the settings even if
-- they were changed before this migration was applied
-- =====================================================
DO $$
DECLARE
    v_current_config JSONB;
    v_utc_hour INTEGER;
    v_minute INTEGER;
    v_cron_expression TEXT;
    v_timezone TEXT;
    v_local_hour INTEGER;
BEGIN
    -- Get current auto-claim configuration
    SELECT config INTO v_current_config
    FROM settings
    WHERE type = 'auto-claim';

    -- Only proceed if auto-claim settings exist
    IF v_current_config IS NOT NULL THEN
        -- Extract schedule values
        v_utc_hour := (v_current_config->'schedule'->>'utc_hour')::INTEGER;
        v_minute := COALESCE((v_current_config->'schedule'->>'minute')::INTEGER, 0);
        v_timezone := v_current_config->'schedule'->>'timezone';
        v_local_hour := (v_current_config->'schedule'->>'hour')::INTEGER;

        -- Validate before applying
        IF v_utc_hour IS NULL OR v_utc_hour < 0 OR v_utc_hour > 23 THEN
            RAISE WARNING 'Invalid utc_hour in current settings: %. Using default 13 (8 AM EST)', v_utc_hour;
            v_utc_hour := 13;
        END IF;

        IF v_minute < 0 OR v_minute > 59 THEN
            RAISE WARNING 'Invalid minute in current settings: %. Using default 0', v_minute;
            v_minute := 0;
        END IF;

        -- Build cron expression
        v_cron_expression := format('%s %s * * *', v_minute, v_utc_hour);

        -- Unschedule existing job
        PERFORM cron.unschedule('auto-create-daily-claims');

        -- Schedule with current settings
        PERFORM cron.schedule(
            'auto-create-daily-claims',
            v_cron_expression,
            $cmd$SELECT auto_create_daily_claims();$cmd$
        );

        -- Log initialization
        INSERT INTO system_logs (event_type, event_data)
        VALUES ('cronjob_schedule_initialized', jsonb_build_object(
            'cron_expression', v_cron_expression,
            'utc_hour', v_utc_hour,
            'minute', v_minute,
            'timezone', v_timezone,
            'local_hour', v_local_hour,
            'initialized_at', NOW(),
            'migration', '20251119130000_auto_update_cronjob_on_schedule_change'
        ));

        RAISE NOTICE 'Cronjob initialized with current settings: % (UTC hour: %, timezone: %)',
            v_cron_expression, v_utc_hour, v_timezone;
    ELSE
        RAISE WARNING 'No auto-claim settings found. Cronjob not initialized.';
    END IF;
END $$;

-- =====================================================
-- 4. VERIFICATION QUERIES (for testing)
-- =====================================================
-- Uncomment these to verify the trigger is working:

-- Check trigger exists:
-- SELECT tgname, tgenabled, tgtype FROM pg_trigger WHERE tgname = 'trigger_auto_update_cronjob';

-- Check function exists:
-- SELECT proname, prosrc FROM pg_proc WHERE proname = 'auto_update_cronjob_schedule';

-- View current cronjob schedule:
-- SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'auto-create-daily-claims';

-- View current settings:
-- SELECT config->'schedule' FROM settings WHERE type = 'auto-claim';

-- View schedule change history:
-- SELECT * FROM system_logs WHERE event_type IN ('cronjob_schedule_updated', 'cronjob_schedule_initialized') ORDER BY created_at DESC;

-- Test the trigger (change hour from current to 15):
-- UPDATE settings SET config = jsonb_set(config, '{schedule,utc_hour}', '15') WHERE type = 'auto-claim';
-- Then check: SELECT schedule FROM cron.job WHERE jobname = 'auto-create-daily-claims';

-- =====================================================
-- Migration Notes
-- =====================================================
-- After this migration:
-- 1. Cronjob schedule is automatically synced with settings table
-- 2. Any updates to schedule hour or minute trigger immediate cronjob reschedule
-- 3. All changes are logged to system_logs for audit trail
-- 4. Invalid values are validated and rejected with warnings
-- 5. No application code changes required - works at database level
--
-- The admin UI will now work as expected:
-- - Admin changes schedule time in settings UI
-- - Settings table is updated
-- - Trigger automatically reschedules cronjob
-- - Cronjob runs at new configured time
-- =====================================================
