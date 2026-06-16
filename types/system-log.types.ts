// System log entity type matching the database schema
export interface SystemLog {
  id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: Date;
}

// DTO for creating a new system log
export interface CreateSystemLogDTO {
  event_type: string;
  event_data?: Record<string, unknown> | null;
}

// DTO for system log response
export interface SystemLogResponseDTO {
  id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: Date;
}

// Query filters for finding system logs
export interface SystemLogFilters {
  event_type?: string;
  created_at_from?: Date;
  created_at_to?: Date;
}

// Pagination options
export interface SystemLogPaginationOptions {
  page?: number;
  limit?: number;
}

// Paginated response
export interface PaginatedSystemLogResponse {
  data: SystemLogResponseDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
