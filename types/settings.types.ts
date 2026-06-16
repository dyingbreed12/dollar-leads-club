// Settings Types
// Generic settings system for configurable application options

// =====================================================
// BASE SETTING TYPES
// =====================================================

export interface Setting {
  id: string;
  type: string;
  config: Record<string, unknown>;
  description?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface SettingResponseDTO {
  id: string;
  type: string;
  config: Record<string, unknown>;
  description?: string;
  updated_at: string;
}

export interface UpdateSettingDTO {
  config: Record<string, unknown>;
  updated_by?: string;
}

// =====================================================
// AUTO-CLAIM CONFIGURATION TYPES
// =====================================================

export interface AutoClaimScheduleConfig {
  hour: number; // 0-23
  minute: number; // 0-59
  timezone: string; // e.g., 'America/New_York'
  utc_hour: number; // Corresponding UTC hour
}

export interface AutoClaimPlanConfig {
  dollar_leads: number; // Number of dollar-leads to claim
  diamond_leads: number; // Number of diamond-leads to claim
  weekdays_only: boolean; // Only claim on Mon-Fri
  description?: string; // Human-readable description
}

export interface AutoClaimPlansConfig {
  'dollar-lead': AutoClaimPlanConfig;
  'diamond-lead': AutoClaimPlanConfig;
  [key: string]: AutoClaimPlanConfig; // Allow for future plan types
}

export interface AutoClaimNotificationsConfig {
  send_email: boolean;
  email_api_url?: string | null;
  include_csv_attachment?: boolean;
}

export interface AutoClaimLoggingConfig {
  log_executions: boolean;
  log_errors: boolean;
  log_insufficient_leads: boolean;
}

export interface AutoClaimConfig {
  enabled: boolean;
  schedule: AutoClaimScheduleConfig;
  plans: AutoClaimPlansConfig;
  notifications: AutoClaimNotificationsConfig;
  logging: AutoClaimLoggingConfig;
  [key: string]: unknown;
}

// =====================================================
// AUTO-CLAIM SETTING
// =====================================================

export interface AutoClaimSetting extends Setting {
  type: 'auto-claim';
  config: AutoClaimConfig;
}

export interface AutoClaimSettingResponseDTO extends SettingResponseDTO {
  type: 'auto-claim';
  config: AutoClaimConfig;
}

// =====================================================
// UPDATE DTOs
// =====================================================

export interface UpdateAutoClaimConfigDTO {
  enabled?: boolean;
  schedule?: Partial<AutoClaimScheduleConfig>;
  plans?: Partial<{
    'dollar-lead': Partial<AutoClaimPlanConfig>;
    'diamond-lead': Partial<AutoClaimPlanConfig>;
  }>;
  notifications?: Partial<AutoClaimNotificationsConfig>;
  logging?: Partial<AutoClaimLoggingConfig>;
}

// =====================================================
// SETTING TYPE CONSTANTS
// =====================================================

export const SETTING_TYPES = {
  AUTO_CLAIM: 'auto-claim',
  EMAIL: 'email',
  STRIPE: 'stripe',
  GENERAL: 'general',
} as const;

export type SettingType = (typeof SETTING_TYPES)[keyof typeof SETTING_TYPES];

// =====================================================
// AUTO-CLAIM EXECUTION RESULTS
// =====================================================

export interface AutoClaimExecutionStats {
  diamond_lead_claims: number;
  diamond_dollar_claims: number;
  dollar_claims: number;
  total_claims: number;
  skipped: number;
  errors: number;
  executed_at: string;
  day_of_week: number;
  is_weekday: boolean;
  config_used: AutoClaimPlansConfig;
}

export interface AutoClaimExecutionResult {
  success: boolean;
  message?: string;
  stats?: AutoClaimExecutionStats;
  executed_at: string;
}

// =====================================================
// FILTERS AND QUERIES
// =====================================================

export interface SettingsFilters {
  type?: string;
  updated_after?: string;
  updated_before?: string;
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

export const AUTO_CLAIM_DEFAULTS: AutoClaimConfig = {
  enabled: true,
  schedule: {
    hour: 8,
    minute: 0,
    timezone: 'America/New_York',
    utc_hour: 13,
  },
  plans: {
    'dollar-lead': {
      dollar_leads: 5,
      diamond_leads: 0,
      weekdays_only: true,
      description: 'Dollar plan users receive 5 dollar-leads on weekdays only',
    },
    'diamond-lead': {
      dollar_leads: 10,
      diamond_leads: 2,
      weekdays_only: false,
      description: 'Diamond plan users receive 2 diamond-leads + 10 dollar-leads daily',
    },
  },
  notifications: {
    send_email: false,
    email_api_url: null,
    include_csv_attachment: false,
  },
  logging: {
    log_executions: true,
    log_errors: true,
    log_insufficient_leads: true,
  },
};

// Type guard for AutoClaimConfig
export function isAutoClaimConfig(config: unknown): config is AutoClaimConfig {
  if (typeof config !== 'object' || config === null) return false;

  const c = config as Record<string, unknown>;

  return (
    typeof c.enabled === 'boolean' &&
    typeof c.schedule === 'object' &&
    typeof c.plans === 'object' &&
    typeof c.notifications === 'object' &&
    typeof c.logging === 'object'
  );
}

// Validation function for plan config
export function validatePlanConfig(planConfig: Partial<AutoClaimPlanConfig>): string[] {
  const errors: string[] = [];

  if (
    planConfig.dollar_leads !== undefined &&
    (planConfig.dollar_leads < 0 || planConfig.dollar_leads > 100)
  ) {
    errors.push('dollar_leads must be between 0 and 100');
  }

  if (
    planConfig.diamond_leads !== undefined &&
    (planConfig.diamond_leads < 0 || planConfig.diamond_leads > 100)
  ) {
    errors.push('diamond_leads must be between 0 and 100');
  }

  return errors;
}

// Validation function for schedule config
export function validateScheduleConfig(scheduleConfig: Partial<AutoClaimScheduleConfig>): string[] {
  const errors: string[] = [];

  if (
    scheduleConfig.hour !== undefined &&
    (scheduleConfig.hour < 0 || scheduleConfig.hour > 23)
  ) {
    errors.push('hour must be between 0 and 23');
  }

  if (
    scheduleConfig.minute !== undefined &&
    (scheduleConfig.minute < 0 || scheduleConfig.minute > 59)
  ) {
    errors.push('minute must be between 0 and 59');
  }

  if (
    scheduleConfig.utc_hour !== undefined &&
    (scheduleConfig.utc_hour < 0 || scheduleConfig.utc_hour > 23)
  ) {
    errors.push('utc_hour must be between 0 and 23');
  }

  return errors;
}
