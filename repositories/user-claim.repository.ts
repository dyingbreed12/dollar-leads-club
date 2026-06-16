import { createAdminClient } from '@/utils/supabase/server';
import { IBaseRepository } from './base.repository';
import {
  UserClaim,
  CreateUserClaimDTO,
  UpdateUserClaimDTO,
  UserClaimFilters,
  ClaimSource,
} from '@/types/user-claim.types';
import { settingsService } from '@/services/settings.service';

/**
 * User Claim Repository
 *
 * Handles all database operations for the UserClaim entity.
 * Implements the IBaseRepository interface for type-safe CRUD operations.
 */
export class UserClaimRepository implements IBaseRepository<UserClaim, CreateUserClaimDTO, UpdateUserClaimDTO, UserClaimFilters> {
  private tableName = 'user_claims';

  /**
   * Find a user claim by ID
   */
  async findById(id: string): Promise<UserClaim | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToUserClaim(data);
  }

  /**
   * Find all user claims matching the given filters
   */
  async findAll(filters?: UserClaimFilters): Promise<UserClaim[]> {
    const supabase = createAdminClient();

    let query = supabase.from(this.tableName).select('*').order('claimed_at', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.viewed !== undefined) {
        query = query.eq('viewed', filters.viewed);
      }
      if (filters.downloaded !== undefined) {
        query = query.eq('downloaded', filters.downloaded);
      }
      if (filters.source) {
        query = query.eq('source', filters.source);
      }
      if (filters.pack_name) {
        query = query.eq('pack_name', filters.pack_name);
      }
      if (filters.stripe_session_id) {
        query = query.eq('stripe_session_id', filters.stripe_session_id);
      }
      if (filters.claimed_at_from) {
        query = query.gte('claimed_at', filters.claimed_at_from.toISOString());
      }
      if (filters.claimed_at_to) {
        query = query.lte('claimed_at', filters.claimed_at_to.toISOString());
      }
      if (filters.created_at_from) {
        query = query.gte('created_at', filters.created_at_from.toISOString());
      }
      if (filters.created_at_to) {
        query = query.lte('created_at', filters.created_at_to.toISOString());
      }
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map((item) => this.mapToUserClaim(item));
  }

  /**
   * Find user claims by user ID
   */
  async findByUserId(userId: string): Promise<UserClaim[]> {
    return this.findAll({ user_id: userId });
  }

  /**
   * Find user claims by type
   */
  async findByType(type: 'dollar-lead' | 'diamond-lead'): Promise<UserClaim[]> {
    return this.findAll({ type });
  }

  /**
   * Find unviewed claims for a user
   */
  async findUnviewedByUser(userId: string): Promise<UserClaim[]> {
    return this.findAll({ user_id: userId, viewed: false });
  }

  /**
   * Find undownloaded claims for a user
   */
  async findUndownloadedByUser(userId: string): Promise<UserClaim[]> {
    return this.findAll({ user_id: userId, downloaded: false });
  }

  /**
   * Find today's claim for a user by type
   */
  async findTodaysClaim(userId: string, type: 'dollar-lead' | 'diamond-lead'): Promise<UserClaim | null> {
    const supabase = createAdminClient();

    // Get UTC hour from settings (defaults to 8 if not configured)
    const utcHour = await this.getUtcHourFromSettings();

    // Use configured UTC hour cutoff to match the eligibility check logic
    const now = new Date();
    const todayCutoff = new Date(now);
    todayCutoff.setUTCHours(utcHour, 0, 0, 0);
    console.log('todayCutoff: ', todayCutoff);

    // If current time is before the configured UTC hour, use yesterday's cutoff
    if (now < todayCutoff) {
      todayCutoff.setUTCDate(todayCutoff.getUTCDate() - 1);
    }

    console.log('todayCutoff: ', todayCutoff);
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .gte('claimed_at', todayCutoff.toISOString())
      .order('claimed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToUserClaim(data);
  }

  /**
   * Find the latest (most recent) claim for a user by type
   */
  async findLatestClaim(userId: string, type: 'dollar-lead' | 'diamond-lead'): Promise<UserClaim | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .eq('type', type)
      .order('claimed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToUserClaim(data);
  }

  /**
   * Find claim history for a user by type
   */
  async findClaimHistory(userId: string, type: 'dollar-lead' | 'diamond-lead'): Promise<UserClaim[]> {
    return this.findAll({ user_id: userId, type });
  }

  /**
   * Create a new user claim
   */
  async create(data: CreateUserClaimDTO): Promise<UserClaim> {
    const supabase = createAdminClient();

    const { data: newUserClaim, error } = await supabase
      .from(this.tableName)
      .insert({
        user_id: data.user_id,
        type: data.type,
        lead_count: data.lead_count,
        claimed_at: data.claimed_at || new Date().toISOString(),
        source: data.source || 'manual',
        pack_name: data.pack_name || null,
        stripe_session_id: data.stripe_session_id || null,
      })
      .select()
      .single();

    if (error || !newUserClaim) {
      throw new Error(`Failed to create user claim: ${error?.message}`);
    }

    return this.mapToUserClaim(newUserClaim);
  }

  /**
   * Update an existing user claim
   */
  async update(id: string, data: UpdateUserClaimDTO): Promise<UserClaim | null> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedUserClaim, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedUserClaim) {
      return null;
    }

    return this.mapToUserClaim(updatedUserClaim);
  }

  /**
   * Mark a claim as viewed
   */
  async markAsViewed(id: string): Promise<UserClaim | null> {
    return this.update(id, {
      viewed: true,
      viewed_at: new Date(),
    });
  }

  /**
   * Mark a claim as downloaded
   */
  async markAsDownloaded(id: string): Promise<UserClaim | null> {
    return this.update(id, {
      downloaded: true,
      downloaded_at: new Date(),
    });
  }

  /**
   * Delete a user claim
   */
  async delete(id: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    return !error;
  }

  /**
   * Check if a user claim exists
   */
  async exists(id: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { count, error } = await supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('id', id);

    return !error && (count ?? 0) > 0;
  }

  /**
   * Count user claims matching the given filters
   */
  async count(filters?: UserClaimFilters): Promise<number> {
    const supabase = createAdminClient();

    let query = supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true });

    // Apply filters
    if (filters) {
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.viewed !== undefined) {
        query = query.eq('viewed', filters.viewed);
      }
      if (filters.downloaded !== undefined) {
        query = query.eq('downloaded', filters.downloaded);
      }
      if (filters.source) {
        query = query.eq('source', filters.source);
      }
      if (filters.pack_name) {
        query = query.eq('pack_name', filters.pack_name);
      }
      if (filters.stripe_session_id) {
        query = query.eq('stripe_session_id', filters.stripe_session_id);
      }
      if (filters.claimed_at_from) {
        query = query.gte('claimed_at', filters.claimed_at_from.toISOString());
      }
      if (filters.claimed_at_to) {
        query = query.lte('claimed_at', filters.claimed_at_to.toISOString());
      }
    }

    const { count, error } = await query;

    if (error) {
      return 0;
    }

    return count ?? 0;
  }

  /**
   * Get UTC hour from settings, fallback to default if not found
   */
  private async getUtcHourFromSettings(): Promise<number> {
    try {
      const autoClaimConfig = await settingsService.getAutoClaimConfig();
      if (autoClaimConfig && autoClaimConfig.config.schedule.utc_hour !== undefined) {
        return autoClaimConfig.config.schedule.utc_hour;
      }
    } catch (error) {
      console.error('Error fetching UTC hour from settings:', error);
    }

    // Fallback to default UTC hour (8 AM UTC = 1 PM UTC for 8 AM EST)
    return 8;
  }

  /**
   * Map database record to UserClaim entity
   */
  private mapToUserClaim(data: Record<string, unknown>): UserClaim {
    return {
      id: data.id as string,
      user_id: data.user_id as string,
      type: data.type as 'dollar-lead' | 'diamond-lead',
      claimed_at: new Date(data.claimed_at as string),
      lead_count: data.lead_count as number,
      viewed: data.viewed as boolean,
      viewed_at: data.viewed_at ? new Date(data.viewed_at as string) : null,
      downloaded: data.downloaded as boolean,
      downloaded_at: data.downloaded_at ? new Date(data.downloaded_at as string) : null,
      source: (data.source as ClaimSource) || 'manual',
      pack_name: data.pack_name as string | null,
      stripe_session_id: data.stripe_session_id as string | null,
      created_at: new Date(data.created_at as string),
      updated_at: new Date(data.updated_at as string),
    };
  }
}

// Export singleton instance
export const userClaimRepository = new UserClaimRepository();
