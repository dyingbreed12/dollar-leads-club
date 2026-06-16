import { createAdminClient } from '@/utils/supabase/server';
import { IBaseRepository } from './base.repository';
import {
  User,
  CreateUserDTO,
  UpdateUserDTO,
  UserFilters,
  PaginationOptions,
} from '@/types/user.types';

/**
 * User Repository
 *
 * Handles all database operations for the User entity.
 * Implements the IBaseRepository interface for type-safe CRUD operations.
 */
export class UserRepository implements IBaseRepository<User, CreateUserDTO, UpdateUserDTO, UserFilters> {
  private tableName = 'users';

  /**
   * Find a user by ID
   */
  async findById(id: string): Promise<User | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToUser(data);
  }

  /**
   * Find a user by email (case-insensitive)
   */
  async findByEmail(email: string): Promise<User | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .rpc('find_user_by_email_case_insensitive', {
        email_input: email
      });

    if (error || !data || data.length === 0) {
      return null;
    }

    // RPC returns an array, get the first item
    return this.mapToUser(data[0]);
  }

  /**
   * Find a user by Stripe customer ID
   */
  async findByStripeCustomerId(stripeCustomerId: string): Promise<User | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('stripe_customer_id', stripeCustomerId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToUser(data);
  }

  /**
   * Get all users without any filters or pagination
   */
  async getAllUsers(): Promise<User[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((item) => this.mapToUser(item));
  }

  /**
   * Get all users without any filters or pagination (Admin - bypasses RLS)
   * Use this in cron jobs and admin operations
   */
  async getAllUsersAdmin(): Promise<User[]> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('[Admin] Failed to get all users:', error);
      return [];
    }

    return data.map((item) => this.mapToUser(item));
  }

  /**
   * Find all users matching the given filters
   */
  async findAll(filters?: UserFilters, pagination?: PaginationOptions): Promise<User[]> {
    const supabase = createAdminClient();

    let query = supabase.from(this.tableName).select('*');

    // Apply filters
    if (filters) {
      if (filters.email) {
        query = query.eq('email', filters.email);
      }
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters.email_verified !== undefined) {
        query = query.eq('email_verified', filters.email_verified);
      }
      if (filters.subscription_plan) {
        query = query.eq('subscription_plan', filters.subscription_plan);
      }
      if (filters.subscription_status) {
        query = query.eq('subscription_status', filters.subscription_status);
      }
      if (filters.is_logged_in !== undefined) {
        query = query.eq('is_logged_in', filters.is_logged_in);
      }
      if (filters.lead_access !== undefined) {
        query = query.eq('lead_access', filters.lead_access);
      }
      // Text search for name or email
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
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

    return data.map((item) => this.mapToUser(item));
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserDTO): Promise<User> {
    const supabase = createAdminClient();

    const { data: newUser, error } = await supabase
      .from(this.tableName)
      .insert({
        name: data.name,
        email: data.email,
        password_hash: data.password_hash || null,
        password_raw: data.password_raw || null,
        email_verified: data.email_verified || false,
        stripe_customer_id: data.stripe_customer_id || null,
        stripe_subscription_id: data.stripe_subscription_id || null,
        subscription_plan: data.subscription_plan || null,
        subscription_status: data.subscription_status || null,
        subscription_current_period_end: data.subscription_current_period_end || null,
        lead_access: data.lead_access || false,
        role: data.role || 'user',
      })
      .select()
      .single();

    if (error || !newUser) {
      throw new Error(`Failed to create user: ${error?.message}`);
    }

    return this.mapToUser(newUser);
  }

  /**
   * Update an existing user
   */
  async update(id: string, data: UpdateUserDTO): Promise<User | null> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedUser, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user:', error);
      return null;
    }

    if (!updatedUser) {
      return null;
    }

    return this.mapToUser(updatedUser);
  }

  /**
   * Delete a user
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
   * Check if a user exists
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
   * Check if a user exists by email
   */
  async existsByEmail(email: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { count, error } = await supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true })
      .eq('email', email);

    return !error && (count ?? 0) > 0;
  }

  /**
   * Count users matching the given filters
   */
  async count(filters?: UserFilters): Promise<number> {
    const supabase = createAdminClient();

    let query = supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true });

    // Apply filters
    if (filters) {
      if (filters.lead_access !== undefined) {
        query = query.eq('lead_access', filters.lead_access);
      }
      if (filters.email) {
        query = query.eq('email', filters.email);
      }
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters.email_verified !== undefined) {
        query = query.eq('email_verified', filters.email_verified);
      }
      if (filters.subscription_plan) {
        query = query.eq('subscription_plan', filters.subscription_plan);
      }
      if (filters.subscription_status) {
        query = query.eq('subscription_status', filters.subscription_status);
      }
      if (filters.is_logged_in !== undefined) {
        query = query.eq('is_logged_in', filters.is_logged_in);
      }
      // Text search for name or email
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
    }

    const { count, error } = await query;

    if (error) {
      return 0;
    }

    return count ?? 0;
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, passwordHash: string, passwordRaw: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        password_hash: passwordHash,
        password_raw: passwordRaw,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return !error;
  }

  /**
   * Set verification token
   */
  async setVerificationToken(id: string, token: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        verification_token: token,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return !error;
  }

  /**
   * Verify user email
   */
  async verifyEmail(id: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        email_verified: true,
        verification_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return !error;
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(id: string, token: string, expiresAt: Date): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        password_reset_token: token,
        password_reset_expires: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return !error;
  }

  /**
   * Update Stripe customer information
   */
  async updateStripeInfo(
    id: string,
    data: {
      stripe_customer_id?: string;
      stripe_subscription_id?: string;
    }
  ): Promise<boolean> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.stripe_customer_id !== undefined) {
      updateData.stripe_customer_id = data.stripe_customer_id;
    }

    if (data.stripe_subscription_id !== undefined) {
      updateData.stripe_subscription_id = data.stripe_subscription_id;
    }

    const { error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Failed to update Stripe info for user:', id, error);
      throw new Error(`Failed to update Stripe info: ${error.message}`);
    }

    return true;
  }

  /**
   * Update subscription information
   */
  async updateSubscription(
    id: string,
    data: {
      subscription_plan?: string | null;
      subscription_status?: string | null;
      subscription_current_period_end?: string | null;
    }
  ): Promise<boolean> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.subscription_plan !== undefined) {
      updateData.subscription_plan = data.subscription_plan;
    }

    if (data.subscription_status !== undefined) {
      updateData.subscription_status = data.subscription_status;
    }

    if (data.subscription_current_period_end !== undefined) {
      updateData.subscription_current_period_end = data.subscription_current_period_end;
    }

    const { error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Failed to update subscription for user:', id, error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }

    return true;
  }

  /**
   * Update login status
   */
  async updateLoginStatus(id: string, isLoggedIn: boolean): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        is_logged_in: isLoggedIn,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    return !error;
  }

  /**
   * ADMIN METHODS - Use service role key, bypass RLS
   * These methods should ONLY be used in webhooks and admin operations
   */

  /**
   * Update Stripe customer information (Admin - bypasses RLS)
   * Use this in webhooks and admin operations only
   */
  async updateStripeInfoAdmin(
    id: string,
    data: {
      stripe_customer_id?: string;
      stripe_subscription_id?: string;
      stripe_subscription_status?: string;
      stripe_subscription_current_period_end?: string;
    }
  ): Promise<boolean> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.stripe_customer_id !== undefined) {
      updateData.stripe_customer_id = data.stripe_customer_id;
    }

    if (data.stripe_subscription_id !== undefined) {
      updateData.stripe_subscription_id = data.stripe_subscription_id;
    }

    if (data.stripe_subscription_status !== undefined) {
      updateData.stripe_subscription_status = data.stripe_subscription_status;
    }

    if (data.stripe_subscription_current_period_end !== undefined) {
      updateData.stripe_subscription_current_period_end = data.stripe_subscription_current_period_end;
    }
    console.log('updateData1: ', updateData);
    const { error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('[Admin] Failed to update Stripe info for user:', id, error);
      throw new Error(`Failed to update Stripe info: ${error.message}`);
    }

    return true;
  }

  /**
   * Update subscription information (Admin - bypasses RLS)
   * Use this in webhooks and admin operations only
   */
  async updateSubscriptionAdmin(
    id: string,
    data: {
      subscription_plan?: string | null;
      subscription_status?: string | null;
      subscription_current_period_end?: string | null;

    }
  ): Promise<boolean> {
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.subscription_plan !== undefined) {
      updateData.subscription_plan = data.subscription_plan;
    }

    if (data.subscription_status !== undefined) {
      updateData.subscription_status = data.subscription_status;
    }

    if (data.subscription_current_period_end !== undefined) {
      updateData.subscription_current_period_end = data.subscription_current_period_end;
    }

    const { error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('[Admin] Failed to update subscription for user:', id, error);
      throw new Error(`Failed to update subscription: ${error.message}`);
    }

    return true;
  }

  /**
   * Find user by Stripe customer ID (Admin - bypasses RLS)
   * Use this in webhooks and admin operations only
   */
  async findByStripeCustomerIdAdmin(customerId: string): Promise<User | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToUser(data);
  }

  /**
   * Map database record to User entity
   */
  private mapToUser(data: Record<string, unknown>): User {
    return {
      id: data.id as string,
      name: data.name as string,
      email: data.email as string,
      password_hash: data.password_hash as string,
      password_raw: data.password_raw as string,
      email_verified: data.email_verified as boolean,
      verification_token: data.verification_token as string | null,
      password_reset_token: data.password_reset_token as string | null,
      password_reset_expires: data.password_reset_expires
        ? new Date(data.password_reset_expires as string)
        : null,
      stripe_customer_id: data.stripe_customer_id as string | null,
      stripe_subscription_id: data.stripe_subscription_id as string | null,
      subscription_plan: data.subscription_plan as string | null,
      subscription_status: data.subscription_status as string | null,
      role: data.role as 'user' | 'admin',
      subscription_current_period_end: data.subscription_current_period_end
        ? new Date(data.subscription_current_period_end as string)
        : null,
      trial_end: data.trial_end ? new Date(data.trial_end as string) : null,
      has_used_trial: data.has_used_trial as boolean,
      is_logged_in: data.is_logged_in as boolean,
      lead_access: data.lead_access as boolean,
      created_at: new Date(data.created_at as string),
      updated_at: new Date(data.updated_at as string),
    };
  }
}

// Export singleton instance
export const userRepository = new UserRepository();