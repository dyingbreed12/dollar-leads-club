// Lead type enum
export type LeadType = 'dollar-lead' | 'diamond-lead';

// Lead batch entity type matching the database schema
export interface LeadBatch {
  id: string;
  user_id: string;
  batch_name: string;
  type: LeadType;
  total_leads: number;
  imported_leads: number;
  skipped_duplicates: number;
  skipped_leads: Record<string, any>[] | null;
  file_url: string;
  file_name: string;
  file_size: number;
  created_at: Date;
  updated_at: Date;
}

// DTO for creating a new lead batch
export interface CreateLeadBatchDTO {
  user_id: string;
  batch_name: string;
  type: LeadType;
  total_leads: number;
  imported_leads: number;
  skipped_duplicates?: number;
  skipped_leads?: Record<string, any>[] | null;
  file_url: string;
  file_name: string;
  file_size: number;
}

// DTO for updating lead batch information
export interface UpdateLeadBatchDTO {
  batch_name?: string;
  total_leads?: number;
  imported_leads?: number;
  skipped_duplicates?: number;
  skipped_leads?: Record<string, any>[] | null;
}

// DTO for lead batch response
export interface LeadBatchResponseDTO {
  id: string;
  user_id: string;
  batch_name: string;
  type: LeadType;
  total_leads: number;
  imported_leads: number;
  skipped_duplicates: number;
  skipped_leads: Record<string, any>[] | null;
  file_url: string;
  file_name: string;
  file_size: number;
  created_at: Date;
  updated_at: Date;
}

// Query filters for finding lead batches
export interface LeadBatchFilters {
  user_id?: string;
  type?: LeadType;
  batch_name?: string;
  created_at_from?: Date;
  created_at_to?: Date;
}

// Extended type with user information for display
export interface LeadBatchWithUser extends LeadBatch {
  user?: {
    id: string;
    name: string;
    email: string;
  };
}
