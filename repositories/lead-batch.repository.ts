import { createAdminClient } from '@/utils/supabase/server';
import { IBaseRepository } from './base.repository';
import {
  LeadBatch,
  CreateLeadBatchDTO,
  UpdateLeadBatchDTO,
  LeadBatchFilters,
} from '@/types/lead-batch.types';

/**
 * Lead Batch Repository
 *
 * Handles all database operations for the LeadBatch entity.
 * Implements the IBaseRepository interface for type-safe CRUD operations.
 */
export class LeadBatchRepository implements IBaseRepository<LeadBatch, CreateLeadBatchDTO, UpdateLeadBatchDTO, LeadBatchFilters> {
  private tableName = 'lead_batches';

  /**
   * Find a lead batch by ID
   */
  async findById(id: string): Promise<LeadBatch | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToLeadBatch(data);
  }

  /**
   * Find all lead batches matching the given filters
   */
  async findAll(filters?: LeadBatchFilters): Promise<LeadBatch[]> {
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
      if (filters.batch_name) {
        query = query.ilike('batch_name', `%${filters.batch_name}%`);
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

    return data.map((item) => this.mapToLeadBatch(item));
  }

  /**
   * Find lead batches by user ID
   */
  async findByUserId(userId: string): Promise<LeadBatch[]> {
    return this.findAll({ user_id: userId });
  }

  /**
   * Find lead batches by type
   */
  async findByType(type: 'dollar-lead' | 'diamond-lead'): Promise<LeadBatch[]> {
    return this.findAll({ type });
  }

  /**
   * Create a new lead batch
   */
  async create(data: CreateLeadBatchDTO): Promise<LeadBatch> {
    const supabase = createAdminClient();

    const { data: newLeadBatch, error } = await supabase
      .from(this.tableName)
      .insert({
        user_id: data.user_id,
        batch_name: data.batch_name,
        type: data.type,
        total_leads: data.total_leads,
        imported_leads: data.imported_leads,
        skipped_duplicates: data.skipped_duplicates || 0,
        skipped_leads: data.skipped_leads || null,
        file_url: data.file_url,
        file_name: data.file_name,
        file_size: data.file_size,
      })
      .select()
      .single();

    if (error || !newLeadBatch) {
      throw new Error(`Failed to create lead batch: ${error?.message}`);
    }

    return this.mapToLeadBatch(newLeadBatch);
  }

  /**
   * Update an existing lead batch
   */
  async update(id: string, data: UpdateLeadBatchDTO): Promise<LeadBatch | null> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedLeadBatch, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedLeadBatch) {
      return null;
    }

    return this.mapToLeadBatch(updatedLeadBatch);
  }

  /**
   * Delete a lead batch
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
   * Check if a lead batch exists
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
   * Count lead batches matching the given filters
   */
  async count(filters?: LeadBatchFilters): Promise<number> {
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
      if (filters.batch_name) {
        query = query.ilike('batch_name', `%${filters.batch_name}%`);
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
   * Map database record to LeadBatch entity
   */
  private mapToLeadBatch(data: Record<string, unknown>): LeadBatch {
    return {
      id: data.id as string,
      user_id: data.user_id as string,
      batch_name: data.batch_name as string,
      type: data.type as 'dollar-lead' | 'diamond-lead',
      total_leads: data.total_leads as number,
      imported_leads: data.imported_leads as number,
      skipped_duplicates: data.skipped_duplicates as number,
      skipped_leads: data.skipped_leads as Record<string, any>[] | null,
      file_url: data.file_url as string,
      file_name: data.file_name as string,
      file_size: data.file_size as number,
      created_at: new Date(data.created_at as string),
      updated_at: new Date(data.updated_at as string),
    };
  }
}

// Export singleton instance
export const leadBatchRepository = new LeadBatchRepository();
