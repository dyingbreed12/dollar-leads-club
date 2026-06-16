// User entity type matching the database schema
export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  password_raw: string;
  email_verified: boolean;
  verification_token: string | null;
  password_reset_token: string | null;
  password_reset_expires: Date | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  role: 'user' | 'admin';
  subscription_current_period_end: Date | null;
  trial_end: Date | null;
  has_used_trial: boolean;
  is_logged_in: boolean;
  lead_access: boolean;
  created_at: Date;
  updated_at: Date;
}

// DTO for creating a new user
export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  password_hash?: string;
  password_raw?: string;
  email_verified?: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_plan?: string;
  subscription_status?: string;
  subscription_current_period_end?: string;
  lead_access?: boolean;
  role?: 'user' | 'admin';
}

// DTO for updating user information
export interface UpdateUserDTO {
  name?: string;
  email?: string;
  email_verified?: boolean;
  verification_token?: string | null;
  password_reset_token?: string | null;
  password_reset_expires?: Date | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_plan?: string | null;
  subscription_status?: string | null;
  role?: 'user' | 'admin';
  subscription_current_period_end?: Date | null;
  trial_end?: Date | null;
  has_used_trial?: boolean;
  is_logged_in?: boolean;
  lead_access?: boolean;
}

// DTO for user response (excludes sensitive data)
export interface UserResponseDTO {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  role: 'user' | 'admin';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_current_period_end: Date | null;
  trial_end: Date | null;
  has_used_trial: boolean;
  is_logged_in: boolean;
  lead_access: boolean;
  created_at: Date;
  updated_at: Date;
}

// Query filters for finding users
export interface UserFilters {
  email?: string;
  role?: 'user' | 'admin';
  email_verified?: boolean;
  subscription_plan?: string;
  subscription_status?: string;
  is_logged_in?: boolean;
  lead_access?: boolean;
  search?: string; // Text search for name or email
}

// Pagination options
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: keyof User;
  sortOrder?: 'asc' | 'desc';
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
