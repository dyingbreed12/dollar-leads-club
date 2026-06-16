import { createClient, createAdminClient } from '@/utils/supabase/server';
import { IBaseRepository } from './base.repository';
import {
  WaitingList,
  CreateWaitingListDTO,
  UpdateWaitingListDTO,
  WaitingListFilters,
  PaginationOptions,
} from '@/types/waiting-list-types';

/**
 * Waiting List Repository
 *
 * Handles all database operations for the WaitingList entity.
 * Implements the IBaseRepository interface for type-safe CRUD operations.
 */
export class WaitingListRepository implements IBaseRepository<WaitingList, CreateWaitingListDTO, UpdateWaitingListDTO, WaitingListFilters> {
  private tableName = 'waiting_list';

  /**
   * Find an entry by ID
   */
  async findById(id: string): Promise<WaitingList | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToWaitingList(data);
  }

  /**
   * Find a user by email (case-insensitive)
   */
  async findByEmail(email: string): Promise<WaitingList | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .rpc('find_user_by_email_case_insensitive', {
        email_input: email
      });

    if (error || !data || data.length === 0) {
      return null;
    }

    // RPC returns an array, get the first item
    return this.mapToWaitingList(data[0]);
  }

  /**
   * Find all entries matching the given filters
   */
  async findAll(filters?: WaitingListFilters, pagination?: PaginationOptions): Promise<WaitingList[]> {
    const supabase = await createClient();

    let query = supabase.from(this.tableName).select('*');

    // Apply filters
    if (filters) {
      if (filters.email_address) {
        query = query.eq('email_address', filters.email_address);
      }
      if (filters.first_name) {
        query = query.ilike('first_name', `%${filters.first_name}%`);
      }
      if (filters.last_name) {
        query = query.ilike('last_name', `%${filters.last_name}%`);
      }
      if (filters.phone_number) {
        query = query.ilike('phone_number', `%${filters.phone_number}%`);
      }
      if (filters.created_after) {
        query = query.gte('created_at', filters.created_after.toISOString());
      }
      if (filters.created_before) {
        query = query.lte('created_at', filters.created_before.toISOString());
      }
      // Text search for name or email
      if (filters.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email_address.ilike.%${filters.search}%`
        );
      }
    }

    // Apply sorting
    if (pagination?.sortBy) {
      query = query.order(pagination.sortBy, {
        ascending: pagination.sortOrder === 'asc',
      });
    } else {
      // Default sort by created_at desc (newest first)
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (pagination?.limit) {
      const offset = pagination.page ? (pagination.page - 1) * pagination.limit : 0;
      query = query.range(offset, offset + pagination.limit - 1);
    }

    const { data, error } = await query;

    if (error || !data) {
      return [];
    }

    return data.map((item) => this.mapToWaitingList(item));
  }

  /**
   * Create a new waiting list entry
   */
  async create(data: CreateWaitingListDTO): Promise<WaitingList> {
    const supabase = await createClient();

    const { data: newEntry, error } = await supabase
      .from(this.tableName)
      .insert({
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number || null,
        email_address: data.email_address,
      })
      .select()
      .single();

    if (error || !newEntry) {
      throw new Error(`Failed to create waiting list entry: ${error?.message}`);
    }

    return this.mapToWaitingList(newEntry);
  }

  /**
   * Update an existing waiting list entry
   */
  async update(id: string, data: UpdateWaitingListDTO): Promise<WaitingList | null> {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {
      ...data,
    };

    const { data: updatedEntry, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating waiting list entry:', error);
      return null;
    }

    if (!updatedEntry) {
      return null;
    }

    return this.mapToWaitingList(updatedEntry);
  }

  /**
   * Delete a waiting list entry
   */
  async delete(id: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    return !error;
  }

  /**
   * Check if an entry exists
   */
  async exists(id: string): Promise<boolean> {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('id', id);

    return !error && (count ?? 0) > 0;
  }

  /**
   * Check if an entry exists by email
   */
  async existsByEmail(email: string): Promise<boolean> {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('email_address', email);

    return !error && (count ?? 0) > 0;
  }

  /**
   * Count entries matching the given filters
   */
  async count(filters?: WaitingListFilters): Promise<number> {
    const supabase = await createClient();

    let query = supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true });

    // Apply filters
    if (filters) {
      if (filters.email_address) {
        query = query.eq('email_address', filters.email_address);
      }
      if (filters.first_name) {
        query = query.ilike('first_name', `%${filters.first_name}%`);
      }
      if (filters.last_name) {
        query = query.ilike('last_name', `%${filters.last_name}%`);
      }
      if (filters.phone_number) {
        query = query.ilike('phone_number', `%${filters.phone_number}%`);
      }
      if (filters.created_after) {
        query = query.gte('created_at', filters.created_after.toISOString());
      }
      if (filters.created_before) {
        query = query.lte('created_at', filters.created_before.toISOString());
      }
      // Text search for name or email
      if (filters.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email_address.ilike.%${filters.search}%`
        );
      }
    }

    const { count, error } = await query;

    if (error) {
      return 0;
    }

    return count ?? 0;
  }

  /**
   * Get all entries without any filters or pagination (Admin - bypasses RLS)
   * Use this in admin operations
   */
  async getAllEntriesAdmin(): Promise<WaitingList[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('[Admin] Failed to get all waiting list entries:', error);
      return [];
    }

    return data.map((item) => this.mapToWaitingList(item));
  }

  /**
   * Map database record to WaitingList entity
   */
  private mapToWaitingList(data: Record<string, unknown>): WaitingList {
    return {
      id: data.id as string,
      first_name: data.first_name as string,
      last_name: data.last_name as string,
      phone_number: data.phone_number as string | null,
      email_address: data.email_address as string,
      created_at: new Date(data.created_at as string),
    };
  }
}

// Export singleton instance
export const waitingListRepository = new WaitingListRepository();