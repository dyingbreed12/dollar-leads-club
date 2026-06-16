import { LeadType } from './lead-batch.types';

// Re-export LeadType for convenience
export type { LeadType };

// Lead status enum
export type LeadStatus = 'available' | 'claimed' | 'expired';

// Lead entity type matching the database schema
export interface Lead {
  id: string;
  lead_batch_id: string;
  type: LeadType;
  status: LeadStatus;
  claimed_by: string | null;
  claimed_at: Date | null;
  full_name: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone_number: string | null;
  email: string | null;
  property_type: string | null;
  lead_gen: string | null;
  estimate: number;
  mao: number; // Maximum Allowable Offer
  offer_price: number;
  avm: number; // Automated Valuation Model
  equity: number; // Property equity
  market_status: string | null; // Market status
  recording_url: string | null;
  notes: string | null;
  raw_data: Record<string, any> | null;
  search_vector?: string; // Generated column, typically not set manually
  created_at: Date;
  updated_at: Date;
}

// DTO for creating a new lead
export interface CreateLeadDTO {
  lead_batch_id: string;
  type: LeadType;
  status?: LeadStatus;
  full_name?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  phone_number?: string | null;
  email?: string | null;
  property_type?: string | null;
  lead_gen?: string | null;
  estimate?: number;
  mao?: number;
  offer_price?: number;
  avm?: number;
  equity?: number;
  market_status?: string | null;
  recording_url?: string | null;
  notes?: string | null;
  raw_data?: Record<string, any> | null;
}

// DTO for updating lead information
export interface UpdateLeadDTO {
  status?: LeadStatus;
  claimed_by?: string | null;
  claimed_at?: Date | null;
  full_name?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  phone_number?: string | null;
  email?: string | null;
  property_type?: string | null;
  lead_gen?: string | null;
  estimate?: number;
  mao?: number;
  offer_price?: number;
  avm?: number;
  equity?: number;
  market_status?: string | null;
  recording_url?: string | null;
  notes?: string | null;
  raw_data?: Record<string, any> | null;
}

// DTO for lead response
export interface LeadResponseDTO {
  id: string;
  lead_batch_id: string;
  type: LeadType;
  status: LeadStatus;
  claimed_by: string | null;
  claimed_at: Date | null;
  full_name: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone_number: string | null;
  email: string | null;
  property_type: string | null;
  lead_gen: string | null;
  estimate: number;
  mao: number;
  offer_price: number;
  avm: number;
  equity: number;
  market_status: string | null;
  recording_url: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// Query filters for finding leads
export interface LeadFilters {
  lead_batch_id?: string;
  type?: LeadType;
  status?: LeadStatus;
  claimed_by?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  property_type?: string;
  lead_gen?: string;
  min_estimate?: number;
  max_estimate?: number;
  min_mao?: number;
  max_mao?: number;
  min_offer_price?: number;
  max_offer_price?: number;
  min_avm?: number;
  max_avm?: number;
  min_equity?: number;
  max_equity?: number;
  market_status?: string;
  search_query?: string; // For full-text search
  created_at_from?: Date;
  created_at_to?: Date;
}

// Claim eligibility check result
export interface ClaimEligibility {
  canClaim: boolean;
  nextClaimDate: Date | null;
  leadCount: number;
  expectedLeadCount: number; // Configured lead count based on subscription plan
  message: string | null;
}

// Today's claim with leads
export interface TodaysClaimData {
  claim: {
    id: string;
    claimed_at: Date;
    lead_count: number;
    viewed: boolean;
    downloaded: boolean;
    type: LeadType;
  };
  leads: LeadResponseDTO[];
}

// Claim history item for grid display
export interface ClaimHistoryItem {
  id: string;
  type: LeadType;
  claimed_at: Date;
  lead_count: number;
  viewed: boolean;
  downloaded: boolean;
  source: string;
}
