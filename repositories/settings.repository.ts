import { createAdminClient } from '@/utils/supabase/server';
import {
  Setting,
  UpdateSettingDTO,
  SettingsFilters,
} from '@/types/settings.types';

/**
 * Settings Repository
 *
 * Handles all database operations for the Settings entity.
 * Settings are accessed primarily by type (unique identifier) rather than ID.
 */
export class SettingsRepository {
  private tableName = 'settings';

  /**
   * Find a setting by ID
   */
  async findById(id: string): Promise<Setting | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToSetting(data);
  }

  /**
   * Find a setting by type (unique identifier)
   */
  async findByType(type: string): Promise<Setting | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('type', type)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToSetting(data);
  }

  /**
   * Find all settings matching the given filters
   */
  async findAll(filters?: SettingsFilters): Promise<Setting[]> {
    const supabase = createAdminClient();

    let query = supabase.from(this.tableName).select('*');

    // Apply filters
    if (filters) {
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.updated_after) {
        query = query.gte('updated_at', filters.updated_after);
      }
      if (filters.updated_before) {
        query = query.lte('updated_at', filters.updated_before);
      }
    }

    // Order by type for consistent results
    query = query.order('type', { ascending: true });

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map((item) => this.mapToSetting(item));
  }

  /**
   * Create a new setting
   */
  async create(data: {
    type: string;
    config: Record<string, unknown>;
    description?: string;
    updated_by?: string;
  }): Promise<Setting> {
    const supabase = createAdminClient();

    const insertData = {
      type: data.type,
      config: data.config,
      description: data.description || null,
      updated_by: data.updated_by || null,
    };

    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create setting: ${error.message}`);
    }

    return this.mapToSetting(created);
  }

  /**
   * Update a setting by ID
   */
  async update(id: string, data: UpdateSettingDTO): Promise<Setting | null> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      config: data.config,
      updated_at: new Date().toISOString(),
    };

    if (data.updated_by) {
      updateData.updated_by = data.updated_by;
    }

    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[SettingsRepository.update] Supabase error:`, {
        error,
        id,
        data,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
      });
      throw new Error(`Failed to update setting with id '${id}': ${error.message}`);
    }

    if (!updated) {
      console.error(`[SettingsRepository.update] No data returned after update`, {
        id,
        data,
      });
      throw new Error(`Update succeeded but no data returned for setting with id '${id}'`);
    }

    return this.mapToSetting(updated);
  }

  /**
   * Update a setting by type (full replacement)
   */
  async updateByType(type: string, data: UpdateSettingDTO): Promise<Setting | null> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      config: data.config,
      updated_at: new Date().toISOString(),
    };

    if (data.updated_by) {
      updateData.updated_by = data.updated_by;
    }

    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('type', type)
      .select()
      .single();

    if (error) {
      console.error(`[SettingsRepository.updateByType] Supabase error:`, {
        error,
        type,
        data,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
      });
      throw new Error(`Failed to update setting with type '${type}': ${error.message}`);
    }

    if (!updated) {
      console.error(`[SettingsRepository.updateByType] No data returned after update`, {
        type,
        data,
      });
      throw new Error(`Update succeeded but no data returned for setting with type '${type}'`);
    }

    return this.mapToSetting(updated);
  }

  /**
   * Merge partial config into existing setting (partial update)
   */
  async mergeByType(
    type: string,
    partialConfig: Record<string, unknown>,
    updatedBy?: string
  ): Promise<Setting | null> {
    const supabase = createAdminClient();

    // First, get current config
    const current = await this.findByType(type);
    if (!current) {
      return null;
    }

    // Deep merge the configs
    const mergedConfig = this.deepMerge(current.config, partialConfig);

    const updateData: Record<string, unknown> = {
      config: mergedConfig,
      updated_at: new Date().toISOString(),
    };

    if (updatedBy) {
      updateData.updated_by = updatedBy;
    }

    const { data: updated, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('type', type)
      .select()
      .single();

    if (error) {
      console.error(`[SettingsRepository.mergeByType] Supabase error:`, {
        error,
        type,
        partialConfig,
        updatedBy,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
      });
      throw new Error(`Failed to merge setting '${type}': ${error.message}`);
    }

    if (!updated) {
      console.error(`[SettingsRepository.mergeByType] No data returned after update`, {
        type,
        partialConfig,
        updatedBy,
      });
      throw new Error(`Update succeeded but no data returned for setting '${type}'`);
    }

    return this.mapToSetting(updated);
  }

  /**
   * Delete a setting by ID
   */
  async delete(id: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase.from(this.tableName).delete().eq('id', id);

    return !error;
  }

  /**
   * Delete a setting by type
   */
  async deleteByType(type: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase.from(this.tableName).delete().eq('type', type);

    return !error;
  }

  /**
   * Check if a setting exists by type
   */
  async existsByType(type: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { count, error } = await supabase
      .from(this.tableName)
      .select('*', { count: 'exact', head: true })
      .eq('type', type);

    return !error && count !== null && count > 0;
  }

  /**
   * Count all settings
   */
  async count(filters?: SettingsFilters): Promise<number> {
    const supabase = createAdminClient();

    let query = supabase.from(this.tableName).select('*', { count: 'exact', head: true });

    if (filters) {
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
    }

    const { count, error } = await query;

    if (error || count === null) {
      return 0;
    }

    return count;
  }

  /**
   * Map database record to Setting entity
   */
  private mapToSetting(data: Record<string, unknown>): Setting {
    return {
      id: data.id as string,
      type: data.type as string,
      config: data.config as Record<string, unknown>,
      description: data.description as string | undefined,
      updated_by: data.updated_by as string | undefined,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
    };
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
  ): Record<string, unknown> {
    const output = { ...target };

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (
          this.isObject(source[key]) &&
          this.isObject(target[key]) &&
          !Array.isArray(source[key])
        ) {
          output[key] = this.deepMerge(
            target[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>
          );
        } else {
          output[key] = source[key];
        }
      }
    }

    return output;
  }

  /**
   * Check if value is an object
   */
  private isObject(item: unknown): item is Record<string, unknown> {
    return item !== null && typeof item === 'object' && !Array.isArray(item);
  }
}

// Export singleton instance
export const settingsRepository = new SettingsRepository();
