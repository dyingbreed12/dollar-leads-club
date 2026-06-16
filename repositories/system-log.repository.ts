import { createAdminClient } from '@/utils/supabase/server';
import {
  SystemLog,
  CreateSystemLogDTO,
  SystemLogFilters,
} from '@/types/system-log.types';

/**
 * System Log Repository
 *
 * Handles all database operations for the SystemLog entity.
 */
export class SystemLogRepository {
  private tableName = 'system_logs';

  /**
   * Find a system log by ID
   */
  async findById(id: string): Promise<SystemLog | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToSystemLog(data);
  }

  /**
   * Find all system logs matching the given filters with pagination
   */
  async findAll(
    filters?: SystemLogFilters,
    options?: { limit?: number; offset?: number }
  ): Promise<SystemLog[]> {
    const supabase = createAdminClient();

    let query = supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.event_type) {
        query = query.eq('event_type', filters.event_type);
      }
      if (filters.created_at_from) {
        query = query.gte('created_at', filters.created_at_from.toISOString());
      }
      if (filters.created_at_to) {
        query = query.lte('created_at', filters.created_at_to.toISOString());
      }
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map((item) => this.mapToSystemLog(item));
  }

  /**
   * Count system logs matching the given filters
   */
  async count(filters?: SystemLogFilters): Promise<number> {
    const supabase = createAdminClient();

    let query = supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true });

    // Apply filters
    if (filters) {
      if (filters.event_type) {
        query = query.eq('event_type', filters.event_type);
      }
      if (filters.created_at_from) {
        query = query.gte('created_at', filters.created_at_from.toISOString());
      }
      if (filters.created_at_to) {
        query = query.lte('created_at', filters.created_at_to.toISOString());
      }
    }

    const { count, error } = await query;

    if (error) {
      return 0;
    }

    return count ?? 0;
  }

  /**
   * Get distinct event types
   */
  async getDistinctEventTypes(): Promise<string[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('event_type')
      .order('event_type');

    if (error || !data) {
      return [];
    }

    // Get unique event types
    const uniqueTypes = [...new Set(data.map((item) => item.event_type as string))];
    return uniqueTypes;
  }

  /**
   * Create a new system log
   */
  async create(data: CreateSystemLogDTO): Promise<SystemLog> {
    const supabase = createAdminClient();

    const { data: newLog, error } = await supabase
      .from(this.tableName)
      .insert({
        event_type: data.event_type,
        event_data: data.event_data || null,
      })
      .select()
      .single();

    if (error || !newLog) {
      throw new Error(`Failed to create system log: ${error?.message}`);
    }

    return this.mapToSystemLog(newLog);
  }

  /**
   * Delete a system log
   */
  async delete(id: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase.from(this.tableName).delete().eq('id', id);

    return !error;
  }

  /**
   * Delete old system logs (older than specified days)
   */
  async deleteOlderThan(days: number): Promise<number> {
    const supabase = createAdminClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from(this.tableName)
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .select('id');

    if (error) {
      throw new Error(`Failed to delete old logs: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Map database record to SystemLog entity
   */
  private mapToSystemLog(data: Record<string, unknown>): SystemLog {
    return {
      id: data.id as string,
      event_type: data.event_type as string,
      event_data: data.event_data as Record<string, unknown> | null,
      created_at: new Date(data.created_at as string),
    };
  }
}

// Export singleton instance
export const systemLogRepository = new SystemLogRepository();
