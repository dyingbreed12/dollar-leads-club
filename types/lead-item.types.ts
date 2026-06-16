import { LeadType } from './lead-batch.types';

// Lead item entity type matching the database schema
// Supports both file-based packages (legacy) and individual shop leads
export interface LeadItem {
  id: string;
  user_id: string;
  title: string | null;
  type: LeadType;

  // File-based package fields (legacy)
  lead_count: number;
  file_name: string | null;
  file_url: string | null;
  file_path: string | null;
  file_size_bytes: number | null;
  package_date: Date | null;

  // Shop lead fields (individual leads)
  address: string | null;
  location: string | null;
  price: number;
  lead_gen: string | null;
  property_type: string | null;

  // Location filters
  state: string | null;
  city: string | null;
  zip_code: string | null;

  // Metadata
  is_active: boolean;
  views: number;

  // Generated differentiation fields
  is_package: boolean; // Generated: true if file_url IS NOT NULL
  is_shop_lead: boolean; // Generated: true if address IS NOT NULL

  created_at: Date;
  updated_at: Date;
}

// DTO for creating a new lead item
export interface CreateLeadItemDTO {
  user_id: string;
  title?: string | null;
  type: LeadType;

  // For package leads
  lead_count?: number;
  file_name?: string | null;
  file_url?: string | null;
  file_path?: string | null;
  file_size_bytes?: number | null;
  package_date?: Date | null;

  // For shop leads
  address?: string | null;
  location?: string | null;
  price?: number;
  lead_gen?: string | null;
  property_type?: string | null;

  // Location
  state?: string | null;
  city?: string | null;
  zip_code?: string | null;

  // Metadata
  is_active?: boolean;
}

// DTO for updating lead item information
export interface UpdateLeadItemDTO {
  title?: string | null;
  lead_count?: number;
  file_name?: string | null;
  file_url?: string | null;
  file_path?: string | null;
  file_size_bytes?: number | null;
  package_date?: Date | null;
  address?: string | null;
  location?: string | null;
  price?: number;
  lead_gen?: string | null;
  property_type?: string | null;
  state?: string | null;
  city?: string | null;
  zip_code?: string | null;
  is_active?: boolean;
  views?: number;
}

// DTO for lead item response
export interface LeadItemResponseDTO {
  id: string;
  user_id: string;
  title: string | null;
  type: LeadType;
  lead_count: number;
  file_name: string | null;
  file_url: string | null;
  file_size_bytes: number | null;
  package_date: Date | null;
  address: string | null;
  location: string | null;
  price: number;
  lead_gen: string | null;
  property_type: string | null;
  state: string | null;
  city: string | null;
  zip_code: string | null;
  is_active: boolean;
  views: number;
  is_package: boolean;
  is_shop_lead: boolean;
  created_at: Date;
  updated_at: Date;
}

// Query filters for finding lead items
export interface LeadItemFilters {
  user_id?: string;
  type?: LeadType;
  is_active?: boolean;
  is_package?: boolean;
  is_shop_lead?: boolean;
  state?: string;
  city?: string;
  zip_code?: string;
  property_type?: string;
  lead_gen?: string;
  min_price?: number;
  max_price?: number;
  created_at_from?: Date;
  created_at_to?: Date;
}
