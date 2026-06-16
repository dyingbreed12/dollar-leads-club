import { settingsRepository } from '@/repositories/settings.repository';
import {
  Setting,
  AutoClaimConfig,
  AutoClaimSettingResponseDTO,
  UpdateAutoClaimConfigDTO,
  SETTING_TYPES,
  AUTO_CLAIM_DEFAULTS,
  validatePlanConfig,
  validateScheduleConfig,
  isAutoClaimConfig,
} from '@/types/settings.types';

/**
 * Settings Service
 *
 * Business logic for managing application settings.
 * Provides validation, transformation, and CRUD operations for settings.
 */
export class SettingsService {
  /**
   * Get a setting by type
   */
  async getSettingByType(type: string): Promise<Setting | null> {
    return await settingsRepository.findByType(type);
  }

  /**
   * Get all settings
   */
  async getAllSettings(): Promise<Setting[]> {
    return await settingsRepository.findAll();
  }

  /**
   * Get auto-claim configuration
   */
  async getAutoClaimConfig(): Promise<AutoClaimSettingResponseDTO | null> {
    const setting = await settingsRepository.findByType(SETTING_TYPES.AUTO_CLAIM);

    if (!setting) {
      return null;
    }

    if (!isAutoClaimConfig(setting.config)) {
      throw new Error('Invalid auto-claim configuration format');
    }

    return {
      id: setting.id,
      type: 'auto-claim',
      config: setting.config as AutoClaimConfig,
      description: setting.description,
      updated_at: setting.updated_at,
    };
  }

  /**
   * Update auto-claim configuration with validation
   */
  async updateAutoClaimConfig(
    updates: UpdateAutoClaimConfigDTO,
    updatedBy?: string
  ): Promise<AutoClaimSettingResponseDTO> {
    // Get current config
    const currentSetting = await settingsRepository.findByType(SETTING_TYPES.AUTO_CLAIM);

    if (!currentSetting) {
      throw new Error('Auto-claim setting not found. Please run migration to create default settings.');
    }

    if (!isAutoClaimConfig(currentSetting.config)) {
      throw new Error('Invalid auto-claim configuration format in database');
    }

    const currentConfig = currentSetting.config as AutoClaimConfig;

    // Validate updates
    const validationErrors = this.validateAutoClaimUpdates(updates);
    if (validationErrors.length > 0) {
      throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
    }

    // Build partial config for merge
    const partialConfig: Record<string, unknown> = {};

    if (updates.enabled !== undefined) {
      partialConfig.enabled = updates.enabled;
    }

    if (updates.schedule) {
      partialConfig.schedule = {
        ...currentConfig.schedule,
        ...updates.schedule,
      };
    }

    if (updates.plans) {
      const newPlans: Record<string, unknown> = { ...currentConfig.plans };

      if (updates.plans['dollar-lead']) {
        newPlans['dollar-lead'] = {
          ...currentConfig.plans['dollar-lead'],
          ...updates.plans['dollar-lead'],
        };
      }

      if (updates.plans['diamond-lead']) {
        newPlans['diamond-lead'] = {
          ...currentConfig.plans['diamond-lead'],
          ...updates.plans['diamond-lead'],
        };
      }

      partialConfig.plans = newPlans;
    }

    if (updates.notifications) {
      partialConfig.notifications = {
        ...currentConfig.notifications,
        ...updates.notifications,
      };
    }

    if (updates.logging) {
      partialConfig.logging = {
        ...currentConfig.logging,
        ...updates.logging,
      };
    }

    // Merge and update
    const updated = await settingsRepository.mergeByType(
      SETTING_TYPES.AUTO_CLAIM,
      partialConfig,
      updatedBy
    );

    if (!updated) {
      throw new Error('Failed to update auto-claim configuration');
    }

    if (!isAutoClaimConfig(updated.config)) {
      throw new Error('Updated configuration is invalid');
    }

    return {
      id: updated.id,
      type: 'auto-claim',
      config: updated.config as AutoClaimConfig,
      description: updated.description,
      updated_at: updated.updated_at,
    };
  }

  /**
   * Reset auto-claim configuration to defaults
   */
  async resetAutoClaimConfig(updatedBy?: string): Promise<AutoClaimSettingResponseDTO> {
    const updated = await settingsRepository.updateByType(
      SETTING_TYPES.AUTO_CLAIM,
      {
        config: AUTO_CLAIM_DEFAULTS as unknown as Record<string, unknown>,
        updated_by: updatedBy,
      }
    );

    if (!updated) {
      throw new Error('Failed to reset auto-claim configuration');
    }

    return {
      id: updated.id,
      type: 'auto-claim',
      config: AUTO_CLAIM_DEFAULTS,
      description: updated.description,
      updated_at: updated.updated_at,
    };
  }

  /**
   * Enable or disable auto-claim
   */
  async setAutoClaimEnabled(enabled: boolean, updatedBy?: string): Promise<AutoClaimSettingResponseDTO> {
    return await this.updateAutoClaimConfig({ enabled }, updatedBy);
  }

  /**
   * Update lead counts for a specific plan
   */
  async updatePlanLeadCounts(
    plan: 'dollar-lead' | 'diamond-lead',
    dollarLeads: number,
    diamondLeads: number,
    updatedBy?: string
  ): Promise<AutoClaimSettingResponseDTO> {
    const planUpdates: UpdateAutoClaimConfigDTO = {
      plans: {
        [plan]: {
          dollar_leads: dollarLeads,
          diamond_leads: diamondLeads,
        },
      },
    };

    return await this.updateAutoClaimConfig(planUpdates, updatedBy);
  }

  /**
   * Update weekday restriction for a plan
   */
  async updatePlanWeekdayRestriction(
    plan: 'dollar-lead' | 'diamond-lead',
    weekdaysOnly: boolean,
    updatedBy?: string
  ): Promise<AutoClaimSettingResponseDTO> {
    const planUpdates: UpdateAutoClaimConfigDTO = {
      plans: {
        [plan]: {
          weekdays_only: weekdaysOnly,
        },
      },
    };

    return await this.updateAutoClaimConfig(planUpdates, updatedBy);
  }

  /**
   * Update schedule configuration
   */
  async updateSchedule(
    hour: number,
    minute: number,
    timezone: string,
    utcHour: number,
    updatedBy?: string
  ): Promise<AutoClaimSettingResponseDTO> {
    const scheduleUpdates: UpdateAutoClaimConfigDTO = {
      schedule: {
        hour,
        minute,
        timezone,
        utc_hour: utcHour,
      },
    };

    return await this.updateAutoClaimConfig(scheduleUpdates, updatedBy);
  }

  /**
   * Validate auto-claim configuration updates
   */
  private validateAutoClaimUpdates(updates: UpdateAutoClaimConfigDTO): string[] {
    const errors: string[] = [];

    // Validate schedule
    if (updates.schedule) {
      errors.push(...validateScheduleConfig(updates.schedule));
    }

    // Validate plan configs
    if (updates.plans) {
      if (updates.plans['dollar-lead']) {
        const planErrors = validatePlanConfig(updates.plans['dollar-lead']);
        errors.push(...planErrors.map((e) => `dollar-lead plan: ${e}`));
      }

      if (updates.plans['diamond-lead']) {
        const planErrors = validatePlanConfig(updates.plans['diamond-lead']);
        errors.push(...planErrors.map((e) => `diamond-lead plan: ${e}`));
      }
    }

    return errors;
  }

  /**
   * Create a new setting (generic)
   */
  async createSetting(
    type: string,
    config: Record<string, unknown>,
    description?: string,
    createdBy?: string
  ): Promise<Setting> {
    // Check if setting already exists
    const exists = await settingsRepository.existsByType(type);
    if (exists) {
      throw new Error(`Setting with type '${type}' already exists`);
    }

    return await settingsRepository.create({
      type,
      config,
      description,
      updated_by: createdBy,
    });
  }

  /**
   * Delete a setting by type
   */
  async deleteSetting(type: string): Promise<boolean> {
    return await settingsRepository.deleteByType(type);
  }

  /**
   * Check if a setting exists
   */
  async settingExists(type: string): Promise<boolean> {
    return await settingsRepository.existsByType(type);
  }

  /**
   * Get auto-claim status summary
   */
  async getAutoClaimStatus(): Promise<{
    enabled: boolean;
    schedule: string;
    dollarPlanLeads: number;
    diamondPlanDiamondLeads: number;
    diamondPlanDollarLeads: number;
    lastUpdated: string;
  }> {
    const config = await this.getAutoClaimConfig();

    if (!config) {
      throw new Error('Auto-claim configuration not found');
    }

    return {
      enabled: config.config.enabled,
      schedule: `${config.config.schedule.hour}:${config.config.schedule.minute.toString().padStart(2, '0')} ${config.config.schedule.timezone}`,
      dollarPlanLeads: config.config.plans['dollar-lead'].dollar_leads,
      diamondPlanDiamondLeads: config.config.plans['diamond-lead'].diamond_leads,
      diamondPlanDollarLeads: config.config.plans['diamond-lead'].dollar_leads,
      lastUpdated: config.updated_at,
    };
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
