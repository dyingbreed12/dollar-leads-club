import { createAdminClient } from '@/utils/supabase/server';
import { IBaseRepository } from './base.repository';
import {
  Lead,
  CreateLeadDTO,
  UpdateLeadDTO,
  LeadFilters,
  LeadStatus,
} from '@/types/lead.types';

/**
 * Lead Repository
 *
 * Handles all database operations for the Lead entity.
 * Implements the IBaseRepository interface for type-safe CRUD operations.
 */
export class LeadRepository implements IBaseRepository<Lead, CreateLeadDTO, UpdateLeadDTO, LeadFilters> {
  private tableName = 'leads';

  /**
   * Find a lead by ID
   */
  async findById(id: string): Promise<Lead | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToLead(data);
  }

  /**
   * Find all leads matching the given filters
   */
  async findAll(filters?: LeadFilters): Promise<Lead[]> {
    const supabase = createAdminClient();

    let query = supabase.from(this.tableName).select('*').order('created_at', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.lead_batch_id) {
        query = query.eq('lead_batch_id', filters.lead_batch_id);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.claimed_by) {
        query = query.eq('claimed_by', filters.claimed_by);
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters.state) {
        query = query.eq('state', filters.state);
      }
      if (filters.zip_code) {
        query = query.eq('zip_code', filters.zip_code);
      }
      if (filters.property_type) {
        query = query.eq('property_type', filters.property_type);
      }
      if (filters.lead_gen) {
        query = query.eq('lead_gen', filters.lead_gen);
      }
      if (filters.min_estimate !== undefined) {
        query = query.gte('estimate', filters.min_estimate);
      }
      if (filters.max_estimate !== undefined) {
        query = query.lte('estimate', filters.max_estimate);
      }
      if (filters.min_mao !== undefined) {
        query = query.gte('mao', filters.min_mao);
      }
      if (filters.max_mao !== undefined) {
        query = query.lte('mao', filters.max_mao);
      }
      if (filters.min_offer_price !== undefined) {
        query = query.gte('offer_price', filters.min_offer_price);
      }
      if (filters.max_offer_price !== undefined) {
        query = query.lte('offer_price', filters.max_offer_price);
      }
      if (filters.min_avm !== undefined) {
        query = query.gte('avm', filters.min_avm);
      }
      if (filters.max_avm !== undefined) {
        query = query.lte('avm', filters.max_avm);
      }
      if (filters.min_equity !== undefined) {
        query = query.gte('equity', filters.min_equity);
      }
      if (filters.max_equity !== undefined) {
        query = query.lte('equity', filters.max_equity);
      }
      if (filters.market_status) {
        query = query.eq('market_status', filters.market_status);
      }
      if (filters.created_at_from) {
        query = query.gte('created_at', filters.created_at_from.toISOString());
      }
      if (filters.created_at_to) {
        query = query.lte('created_at', filters.created_at_to.toISOString());
      }
      // Note: Full-text search using search_vector would require .textSearch()
      // which can be added when needed
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map((item) => this.mapToLead(item));
  }

  /**
   * Find all leads with server-side pagination and total count
   */
  async findAllWithPagination(
    filters?: LeadFilters,
    pagination?: { limit: number; offset: number }
  ): Promise<{ data: Lead[]; total: number }> {
    const supabase = createAdminClient();

    let query = supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.lead_batch_id) {
        query = query.eq('lead_batch_id', filters.lead_batch_id);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.claimed_by) {
        query = query.eq('claimed_by', filters.claimed_by);
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters.state) {
        query = query.eq('state', filters.state);
      }
      if (filters.zip_code) {
        query = query.eq('zip_code', filters.zip_code);
      }
      if (filters.property_type) {
        query = query.eq('property_type', filters.property_type);
      }
      if (filters.lead_gen) {
        query = query.eq('lead_gen', filters.lead_gen);
      }
      if (filters.min_estimate !== undefined) {
        query = query.gte('estimate', filters.min_estimate);
      }
      if (filters.max_estimate !== undefined) {
        query = query.lte('estimate', filters.max_estimate);
      }
      if (filters.min_mao !== undefined) {
        query = query.gte('mao', filters.min_mao);
      }
      if (filters.max_mao !== undefined) {
        query = query.lte('mao', filters.max_mao);
      }
      if (filters.min_offer_price !== undefined) {
        query = query.gte('offer_price', filters.min_offer_price);
      }
      if (filters.max_offer_price !== undefined) {
        query = query.lte('offer_price', filters.max_offer_price);
      }
      if (filters.min_avm !== undefined) {
        query = query.gte('avm', filters.min_avm);
      }
      if (filters.max_avm !== undefined) {
        query = query.lte('avm', filters.max_avm);
      }
      if (filters.min_equity !== undefined) {
        query = query.gte('equity', filters.min_equity);
      }
      if (filters.max_equity !== undefined) {
        query = query.lte('equity', filters.max_equity);
      }
      if (filters.market_status) {
        query = query.eq('market_status', filters.market_status);
      }
      if (filters.created_at_from) {
        query = query.gte('created_at', filters.created_at_from.toISOString());
      }
      if (filters.created_at_to) {
        query = query.lte('created_at', filters.created_at_to.toISOString());
      }
    }

    // Apply pagination
    if (pagination) {
      const { limit, offset } = pagination;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error || !data) {
      return { data: [], total: 0 };
    }

    return {
      data: data.map((item) => this.mapToLead(item)),
      total: count ?? 0,
    };
  }

  /**
   * Find leads by batch ID
   */
  async findByBatchId(batchId: string): Promise<Lead[]> {
    return this.findAll({ lead_batch_id: batchId });
  }

  /**
   * Find leads by status
   */
  async findByStatus(status: LeadStatus): Promise<Lead[]> {
    return this.findAll({ status });
  }

  /**
   * Find available leads by type
   */
  async findAvailableByType(type: 'dollar-lead' | 'diamond-lead', limit?: number): Promise<Lead[]> {
    const supabase = createAdminClient();

    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('type', type)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map((item) => this.mapToLead(item));
  }

  /**
   * Find leads claimed by a user
   */
  async findClaimedByUser(userId: string): Promise<Lead[]> {
    return this.findAll({ claimed_by: userId });
  }

  /**
   * Full-text search leads
   */
  async search(searchQuery: string): Promise<Lead[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .textSearch('search_vector', searchQuery)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((item) => this.mapToLead(item));
  }

  /**
   * Full-text search leads with pagination
   */
  async searchWithPagination(
    searchQuery: string,
    pagination?: { limit: number; offset: number }
  ): Promise<{ data: Lead[]; total: number }> {
    const supabase = createAdminClient();

    let query = supabase
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .textSearch('search_vector', searchQuery)
      .order('created_at', { ascending: false });

    // Apply pagination
    if (pagination) {
      const { limit, offset } = pagination;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;

    if (error || !data) {
      return { data: [], total: 0 };
    }

    return {
      data: data.map((item) => this.mapToLead(item)),
      total: count ?? 0,
    };
  }

  /**
   * Create a new lead
   */
  async create(data: CreateLeadDTO): Promise<Lead> {
    const supabase = createAdminClient();

    const { data: newLead, error } = await supabase
      .from(this.tableName)
      .insert({
        lead_batch_id: data.lead_batch_id,
        type: data.type,
        status: data.status || 'available',
        full_name: data.full_name || null,
        street_address: data.street_address || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        phone_number: data.phone_number || null,
        email: data.email || null,
        property_type: data.property_type || null,
        lead_gen: data.lead_gen || null,
        estimate: data.estimate || 0,
        mao: data.mao || 0,
        offer_price: data.offer_price || 0,
        avm: data.avm || 0,
        equity: data.equity || 0,
        market_status: data.market_status || null,
        recording_url: data.recording_url || null,
        notes: data.notes || null,
        raw_data: data.raw_data || null,
      })
      .select()
      .single();

    if (error || !newLead) {
      throw new Error(`Failed to create lead: ${error?.message}`);
    }

    return this.mapToLead(newLead);
  }

  /**
   * Bulk create leads
   */
  async createMany(leads: CreateLeadDTO[]): Promise<Lead[]> {
    const supabase = createAdminClient();

    const insertData = leads.map(data => ({
      lead_batch_id: data.lead_batch_id,
      type: data.type,
      status: data.status || 'available',
      full_name: data.full_name || null,
      street_address: data.street_address || null,
      city: data.city || null,
      state: data.state || null,
      zip_code: data.zip_code || null,
      phone_number: data.phone_number || null,
      email: data.email || null,
      property_type: data.property_type || null,
      lead_gen: data.lead_gen || null,
      estimate: data.estimate || 0,
      mao: data.mao || 0,
      offer_price: data.offer_price || 0,
      avm: data.avm || 0,
      equity: data.equity || 0,
      market_status: data.market_status || null,
      recording_url: data.recording_url || null,
      notes: data.notes || null,
      raw_data: data.raw_data || null,
    }));

    const { data: newLeads, error } = await supabase
      .from(this.tableName)
      .insert(insertData)
      .select();

    if (error || !newLeads) {
      throw new Error(`Failed to create leads: ${error?.message}`);
    }

    return newLeads.map((item) => this.mapToLead(item));
  }

  /**
   * Update an existing lead
   */
  async update(id: string, data: UpdateLeadDTO): Promise<Lead | null> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedLead, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedLead) {
      return null;
    }

    return this.mapToLead(updatedLead);
  }

  /**
   * Claim a lead (set status to claimed)
   */
  async claimLead(id: string, userId: string): Promise<Lead | null> {
    return this.update(id, {
      status: 'claimed',
      claimed_by: userId,
      claimed_at: new Date(),
    });
  }

  /**
   * Claim multiple leads for a user (batch operation)
   */
  async claimLeadsForUser(leadIds: string[], userId: string): Promise<Lead[]> {
    const supabase = createAdminClient();
    const claimedAt = new Date().toISOString();

    const { data: claimedLeads, error } = await supabase
      .from(this.tableName)
      .update({
        status: 'claimed',
        claimed_by: userId,
        claimed_at: claimedAt,
        updated_at: claimedAt,
      })
      .in('id', leadIds)
      .select();

    if (error || !claimedLeads) {
      throw new Error(`Failed to claim leads: ${error?.message}`);
    }

    return claimedLeads.map((item) => this.mapToLead(item));
  }

  /**
   * Find leads by their IDs
   */
  async findByIds(ids: string[]): Promise<Lead[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .in('id', ids)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((item) => this.mapToLead(item));
  }

  /**
   * Count available leads by type
   */
  async countAvailableByType(type: 'dollar-lead' | 'diamond-lead'): Promise<number> {
    return this.count({ type, status: 'available' });
  }

  /**
   * Unclaim a lead (set status back to available)
   */
  async unclaimLead(id: string): Promise<Lead | null> {
    return this.update(id, {
      status: 'available',
      claimed_by: null,
      claimed_at: null,
    });
  }

  /**
   * Delete a lead
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
   * Check if a lead exists
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
   * Count leads matching the given filters
   */
  async count(filters?: LeadFilters): Promise<number> {
    const supabase = createAdminClient();

    let query = supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true });

    // Apply filters
    if (filters) {
      if (filters.lead_batch_id) {
        query = query.eq('lead_batch_id', filters.lead_batch_id);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.claimed_by) {
        query = query.eq('claimed_by', filters.claimed_by);
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters.state) {
        query = query.eq('state', filters.state);
      }
      if (filters.zip_code) {
        query = query.eq('zip_code', filters.zip_code);
      }
      if (filters.property_type) {
        query = query.eq('property_type', filters.property_type);
      }
      if (filters.lead_gen) {
        query = query.eq('lead_gen', filters.lead_gen);
      }
    }

    const { count, error } = await query;

    if (error) {
      return 0;
    }

    return count ?? 0;
  }

  /**
   * Map database record to Lead entity
   */
  private mapToLead(data: Record<string, unknown>): Lead {
    return {
      id: data.id as string,
      lead_batch_id: data.lead_batch_id as string,
      type: data.type as 'dollar-lead' | 'diamond-lead',
      status: data.status as LeadStatus,
      claimed_by: data.claimed_by as string | null,
      claimed_at: data.claimed_at ? new Date(data.claimed_at as string) : null,
      full_name: data.full_name as string | null,
      street_address: data.street_address as string | null,
      city: data.city as string | null,
      state: data.state as string | null,
      zip_code: data.zip_code as string | null,
      phone_number: data.phone_number as string | null,
      email: data.email as string | null,
      property_type: data.property_type as string | null,
      lead_gen: data.lead_gen as string | null,
      estimate: data.estimate as number,
      mao: data.mao as number,
      offer_price: data.offer_price as number,
      avm: data.avm as number,
      equity: data.equity as number,
      market_status: data.market_status as string | null,
      recording_url: data.recording_url as string | null,
      notes: data.notes as string | null,
      raw_data: data.raw_data as Record<string, any> | null,
      search_vector: data.search_vector as string | undefined,
      created_at: new Date(data.created_at as string),
      updated_at: new Date(data.updated_at as string),
    };
  }
}

// Export singleton instance
export const leadRepository = new LeadRepository();
