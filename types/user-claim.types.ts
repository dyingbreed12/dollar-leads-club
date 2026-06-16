import { LeadType } from './lead-batch.types';

// Claim source type
export type ClaimSource = 'manual' | 'pack' | 'subscription' | 'auto';

// User claim entity type matching the database schema
export interface UserClaim {
  id: string;
  user_id: string;
  type: LeadType;
  claimed_at: Date;
  lead_count: number;
  viewed: boolean;
  viewed_at: Date | null;
  downloaded: boolean;
  downloaded_at: Date | null;
  source: ClaimSource; // Origin of the claim
  pack_name: string | null; // Name of purchased pack (for pack claims)
  stripe_session_id: string | null; // Stripe payment session ID
  created_at: Date;
  updated_at: Date;
}

// DTO for creating a new user claim
export interface CreateUserClaimDTO {
  user_id: string;
  type: LeadType;
  lead_count: number;
  claimed_at?: Date;
  source?: ClaimSource;
  pack_name?: string | null;
  stripe_session_id?: string | null;
}

// DTO for updating user claim information
export interface UpdateUserClaimDTO {
  viewed?: boolean;
  viewed_at?: Date | null;
  downloaded?: boolean;
  downloaded_at?: Date | null;
  source?: ClaimSource;
  pack_name?: string | null;
  stripe_session_id?: string | null;
}

// DTO for user claim response
export interface UserClaimResponseDTO {
  id: string;
  user_id: string;
  type: LeadType;
  claimed_at: Date;
  lead_count: number;
  viewed: boolean;
  viewed_at: Date | null;
  downloaded: boolean;
  downloaded_at: Date | null;
  source: ClaimSource;
  pack_name: string | null;
  stripe_session_id: string | null;
  created_at: Date;
  updated_at: Date;
}

// Query filters for finding user claims
export interface UserClaimFilters {
  user_id?: string;
  type?: LeadType;
  viewed?: boolean;
  downloaded?: boolean;
  source?: ClaimSource;
  pack_name?: string;
  stripe_session_id?: string;
  claimed_at_from?: Date;
  claimed_at_to?: Date;
  created_at_from?: Date;
  created_at_to?: Date;
}
