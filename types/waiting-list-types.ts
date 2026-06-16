// WaitingList entity type matching the database schema
export interface WaitingList {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email_address: string;
  created_at: Date;
}

// DTO for creating a new waiting list entry
export interface CreateWaitingListDTO {
  first_name: string;
  last_name: string;
  phone_number?: string | null;
  email_address: string;
}

// DTO for updating waiting list information
export interface UpdateWaitingListDTO {
  first_name?: string;
  last_name?: string;
  phone_number?: string | null;
  email_address?: string;
}

// DTO for waiting list response
export interface WaitingListResponseDTO {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email_address: string;
  created_at: Date;
}

// Query filters for finding waiting list entries
export interface WaitingListFilters {
  email_address?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  created_after?: Date;
  created_before?: Date;
  search?: string; // Text search for name or email
}

// Pagination options
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: keyof WaitingList;
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

// Form validation errors
export interface WaitingListFormErrors {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  email_address?: string;
}

// API response type
export interface WaitingListApiResponse {
  success: boolean;
  data?: WaitingListResponseDTO;
  error?: string;
  message?: string;
}