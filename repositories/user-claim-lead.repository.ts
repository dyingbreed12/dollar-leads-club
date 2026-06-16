import { createAdminClient } from '@/utils/supabase/server';
import { IBaseRepository } from './base.repository';
import {
  UserClaimLead,
  CreateUserClaimLeadDTO,
  UpdateUserClaimLeadDTO,
  UserClaimLeadFilters,
} from '@/types/user-claim-lead.types';

/**
 * User Claim Lead Repository
 *
 * Handles all database operations for the UserClaimLead junction entity.
 * Links user claims to specific leads (many-to-many relationship).
 * Implements the IBaseRepository interface for type-safe CRUD operations.
 */
export class UserClaimLeadRepository implements IBaseRepository<UserClaimLead, CreateUserClaimLeadDTO, UpdateUserClaimLeadDTO, UserClaimLeadFilters> {
  private tableName = 'user_claim_leads';

  /**
   * Find a user claim lead by ID
   */
  async findById(id: string): Promise<UserClaimLead | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToUserClaimLead(data);
  }

  /**
   * Find all user claim leads matching the given filters
   */
  async findAll(filters?: UserClaimLeadFilters): Promise<UserClaimLead[]> {
    const supabase = createAdminClient();

    let query = supabase.from(this.tableName).select('*').order('created_at', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.user_claim_id) {
        query = query.eq('user_claim_id', filters.user_claim_id);
      }
      if (filters.lead_id) {
        query = query.eq('lead_id', filters.lead_id);
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

    return data.map((item) => this.mapToUserClaimLead(item));
  }

  /**
   * Find all leads for a specific user claim
   */
  async findByUserClaimId(userClaimId: string): Promise<UserClaimLead[]> {
    return this.findAll({ user_claim_id: userClaimId });
  }

  /**
   * Find all claims for a specific lead
   */
  async findByLeadId(leadId: string): Promise<UserClaimLead[]> {
    return this.findAll({ lead_id: leadId });
  }

  /**
   * Check if a specific claim-lead relationship exists
   */
  async existsByClaimAndLead(userClaimId: string, leadId: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { count, error } = await supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('user_claim_id', userClaimId)
      .eq('lead_id', leadId);

    return !error && (count ?? 0) > 0;
  }

  /**
   * Create a new user claim lead junction
   */
  async create(data: CreateUserClaimLeadDTO): Promise<UserClaimLead> {
    const supabase = createAdminClient();

    const { data: newUserClaimLead, error } = await supabase
      .from(this.tableName)
      .insert({
        user_claim_id: data.user_claim_id,
        lead_id: data.lead_id,
      })
      .select()
      .single();

    if (error || !newUserClaimLead) {
      throw new Error(`Failed to create user claim lead: ${error?.message}`);
    }

    return this.mapToUserClaimLead(newUserClaimLead);
  }

  /**
   * Bulk create user claim leads
   */
  async createMany(data: CreateUserClaimLeadDTO[]): Promise<UserClaimLead[]> {
    const supabase = createAdminClient();

    const insertData = data.map(item => ({
      user_claim_id: item.user_claim_id,
      lead_id: item.lead_id,
    }));

    const { data: newUserClaimLeads, error } = await supabase
      .from(this.tableName)
      .insert(insertData)
      .select();

    if (error || !newUserClaimLeads) {
      throw new Error(`Failed to create user claim leads: ${error?.message}`);
    }

    return newUserClaimLeads.map((item) => this.mapToUserClaimLead(item));
  }

  /**
   * Update an existing user claim lead
   * Note: Junction tables typically don't have updatable fields
   */
  async update(id: string, data: UpdateUserClaimLeadDTO): Promise<UserClaimLead | null> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedUserClaimLead, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedUserClaimLead) {
      return null;
    }

    return this.mapToUserClaimLead(updatedUserClaimLead);
  }

  /**
   * Delete a user claim lead junction
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
   * Delete all junctions for a specific user claim
   */
  async deleteByUserClaimId(userClaimId: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('user_claim_id', userClaimId);

    return !error;
  }

  /**
   * Delete all junctions for a specific lead
   */
  async deleteByLeadId(leadId: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('lead_id', leadId);

    return !error;
  }

  /**
   * Check if a user claim lead exists
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
   * Count user claim leads matching the given filters
   */
  async count(filters?: UserClaimLeadFilters): Promise<number> {
    const supabase = createAdminClient();

    let query = supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true });

    // Apply filters
    if (filters) {
      if (filters.user_claim_id) {
        query = query.eq('user_claim_id', filters.user_claim_id);
      }
      if (filters.lead_id) {
        query = query.eq('lead_id', filters.lead_id);
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
   * Map database record to UserClaimLead entity
   */
  private mapToUserClaimLead(data: Record<string, unknown>): UserClaimLead {
    return {
      id: data.id as string,
      user_claim_id: data.user_claim_id as string,
      lead_id: data.lead_id as string,
      created_at: new Date(data.created_at as string),
      updated_at: new Date(data.updated_at as string),
    };
  }
}

// Export singleton instance
export const userClaimLeadRepository = new UserClaimLeadRepository();
