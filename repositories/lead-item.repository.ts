import { createAdminClient } from '@/utils/supabase/server';
import { IBaseRepository } from './base.repository';
import {
  LeadItem,
  CreateLeadItemDTO,
  UpdateLeadItemDTO,
  LeadItemFilters,
} from '@/types/lead-item.types';

/**
 * Lead Item Repository
 *
 * Handles all database operations for the LeadItem entity.
 * Supports both file-based lead packages (legacy) and individual shop leads.
 * Implements the IBaseRepository interface for type-safe CRUD operations.
 */
export class LeadItemRepository implements IBaseRepository<LeadItem, CreateLeadItemDTO, UpdateLeadItemDTO, LeadItemFilters> {
  private tableName = 'lead_items';

  /**
   * Find a lead item by ID
   */
  async findById(id: string): Promise<LeadItem | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToLeadItem(data);
  }

  /**
   * Find all lead items matching the given filters
   */
  async findAll(filters?: LeadItemFilters): Promise<LeadItem[]> {
    const supabase = createAdminClient();

    let query = supabase.from(this.tableName).select('*').order('created_at', { ascending: false });

    // Apply filters
    if (filters) {
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters.is_package !== undefined) {
        query = query.eq('is_package', filters.is_package);
      }
      if (filters.is_shop_lead !== undefined) {
        query = query.eq('is_shop_lead', filters.is_shop_lead);
      }
      if (filters.state) {
        query = query.eq('state', filters.state);
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
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
      if (filters.min_price !== undefined) {
        query = query.gte('price', filters.min_price);
      }
      if (filters.max_price !== undefined) {
        query = query.lte('price', filters.max_price);
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

    return data.map((item) => this.mapToLeadItem(item));
  }

  /**
   * Find lead items by user ID
   */
  async findByUserId(userId: string): Promise<LeadItem[]> {
    return this.findAll({ user_id: userId });
  }

  /**
   * Find active lead items
   */
  async findActive(filters?: LeadItemFilters): Promise<LeadItem[]> {
    return this.findAll({ ...filters, is_active: true });
  }

  /**
   * Find package leads (file-based)
   */
  async findPackages(filters?: LeadItemFilters): Promise<LeadItem[]> {
    return this.findAll({ ...filters, is_package: true });
  }

  /**
   * Find shop leads (individual leads)
   */
  async findShopLeads(filters?: LeadItemFilters): Promise<LeadItem[]> {
    return this.findAll({ ...filters, is_shop_lead: true });
  }

  /**
   * Find lead items by location
   */
  async findByLocation(state?: string, city?: string, zipCode?: string): Promise<LeadItem[]> {
    const filters: LeadItemFilters = {};
    if (state) filters.state = state;
    if (city) filters.city = city;
    if (zipCode) filters.zip_code = zipCode;
    return this.findAll(filters);
  }

  /**
   * Create a new lead item
   */
  async create(data: CreateLeadItemDTO): Promise<LeadItem> {
    const supabase = createAdminClient();

    const { data: newLeadItem, error } = await supabase
      .from(this.tableName)
      .insert({
        user_id: data.user_id,
        title: data.title || null,
        type: data.type,
        lead_count: data.lead_count || 0,
        file_name: data.file_name || null,
        file_url: data.file_url || null,
        file_path: data.file_path || null,
        file_size_bytes: data.file_size_bytes || null,
        package_date: data.package_date || null,
        address: data.address || null,
        location: data.location || null,
        price: data.price || 0,
        lead_gen: data.lead_gen || null,
        property_type: data.property_type || null,
        state: data.state || null,
        city: data.city || null,
        zip_code: data.zip_code || null,
        is_active: data.is_active !== undefined ? data.is_active : true,
      })
      .select()
      .single();

    if (error || !newLeadItem) {
      throw new Error(`Failed to create lead item: ${error?.message}`);
    }

    return this.mapToLeadItem(newLeadItem);
  }

  /**
   * Update an existing lead item
   */
  async update(id: string, data: UpdateLeadItemDTO): Promise<LeadItem | null> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedLeadItem, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedLeadItem) {
      return null;
    }

    return this.mapToLeadItem(updatedLeadItem);
  }

  /**
   * Increment view count for a lead item
   */
  async incrementViews(id: string): Promise<LeadItem | null> {
    const supabase = createAdminClient();

    // First get the current lead item
    const current = await this.findById(id);
    if (!current) {
      return null;
    }

    return this.update(id, {
      views: current.views + 1,
    });
  }

  /**
   * Deactivate a lead item
   */
  async deactivate(id: string): Promise<LeadItem | null> {
    return this.update(id, { is_active: false });
  }

  /**
   * Activate a lead item
   */
  async activate(id: string): Promise<LeadItem | null> {
    return this.update(id, { is_active: true });
  }

  /**
   * Delete a lead item
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
   * Check if a lead item exists
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
   * Count lead items matching the given filters
   */
  async count(filters?: LeadItemFilters): Promise<number> {
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
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
      if (filters.is_package !== undefined) {
        query = query.eq('is_package', filters.is_package);
      }
      if (filters.is_shop_lead !== undefined) {
        query = query.eq('is_shop_lead', filters.is_shop_lead);
      }
      if (filters.state) {
        query = query.eq('state', filters.state);
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters.property_type) {
        query = query.eq('property_type', filters.property_type);
      }
    }

    const { count, error } = await query;

    if (error) {
      return 0;
    }

    return count ?? 0;
  }

  /**
   * Map database record to LeadItem entity
   */
  private mapToLeadItem(data: Record<string, unknown>): LeadItem {
    return {
      id: data.id as string,
      user_id: data.user_id as string,
      title: data.title as string | null,
      type: data.type as 'dollar-lead' | 'diamond-lead',
      lead_count: data.lead_count as number,
      file_name: data.file_name as string | null,
      file_url: data.file_url as string | null,
      file_path: data.file_path as string | null,
      file_size_bytes: data.file_size_bytes as number | null,
      package_date: data.package_date ? new Date(data.package_date as string) : null,
      address: data.address as string | null,
      location: data.location as string | null,
      price: data.price as number,
      lead_gen: data.lead_gen as string | null,
      property_type: data.property_type as string | null,
      state: data.state as string | null,
      city: data.city as string | null,
      zip_code: data.zip_code as string | null,
      is_active: data.is_active as boolean,
      views: data.views as number,
      is_package: data.is_package as boolean,
      is_shop_lead: data.is_shop_lead as boolean,
      created_at: new Date(data.created_at as string),
      updated_at: new Date(data.updated_at as string),
    };
  }
}

// Export singleton instance
export const leadItemRepository = new LeadItemRepository();
