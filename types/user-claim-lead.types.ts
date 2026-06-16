// User claim lead junction entity type matching the database schema
export interface UserClaimLead {
  id: string;
  user_claim_id: string;
  lead_id: string;
  created_at: Date;
  updated_at: Date;
}

// DTO for creating a new user claim lead junction
export interface CreateUserClaimLeadDTO {
  user_claim_id: string;
  lead_id: string;
}

// DTO for updating user claim lead information
export interface UpdateUserClaimLeadDTO {
  // Junction tables typically don't have updatable fields
  // besides timestamps which are auto-updated
}

// DTO for user claim lead response
export interface UserClaimLeadResponseDTO {
  id: string;
  user_claim_id: string;
  lead_id: string;
  created_at: Date;
  updated_at: Date;
}

// Query filters for finding user claim leads
export interface UserClaimLeadFilters {
  user_claim_id?: string;
  lead_id?: string;
  created_at_from?: Date;
  created_at_to?: Date;
}
