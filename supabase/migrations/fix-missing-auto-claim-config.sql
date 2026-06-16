-- Fix: Missing auto-claim configuration
-- Run this if you get "Auto-claim configuration not found" error

-- Check if settings table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'settings') THEN
        RAISE EXCEPTION 'Settings table does not exist. Please run migration: 20251116080000_create_settings_and_auto_claim.sql';
    END IF;
END $$;

-- Check if auto-claim config exists
DO $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM settings WHERE type = 'auto-claim'
    ) INTO v_exists;

    IF NOT v_exists THEN
        RAISE NOTICE 'Auto-claim configuration not found. Inserting default configuration...';

        -- Insert default auto-claim configuration
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
                },
                "backfill": {
                    "enabled": true,
                    "days_to_check": 7,
                    "fill_shortfalls": true
                }
            }'::jsonb,
            'Configuration for automatic daily lead claims. Controls schedule, lead counts per plan, and notification settings.'
        )
        ON CONFLICT (type) DO UPDATE
        SET config = EXCLUDED.config,
            updated_at = NOW();

        RAISE NOTICE 'Auto-claim configuration inserted successfully!';
    ELSE
        RAISE NOTICE 'Auto-claim configuration already exists.';

        -- Optionally update to add backfill config if missing
        UPDATE settings
        SET config = config || jsonb_build_object(
            'backfill', jsonb_build_object(
                'enabled', true,
                'days_to_check', 7,
                'fill_shortfalls', true
            )
        )
        WHERE type = 'auto-claim'
          AND config->'backfill' IS NULL;

        IF FOUND THEN
            RAISE NOTICE 'Added backfill configuration to existing auto-claim settings.';
        END IF;
    END IF;
END $$;

-- Verify the configuration
SELECT
    type,
    config->'enabled' as enabled,
    config->'schedule'->>'timezone' as timezone,
    config->'schedule'->>'utc_hour' as utc_hour,
    config->'backfill'->>'enabled' as backfill_enabled,
    config->'backfill'->>'days_to_check' as backfill_days,
    created_at,
    updated_at
FROM settings
WHERE type = 'auto-claim';
