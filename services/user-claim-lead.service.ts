import { userClaimLeadRepository } from '@/repositories/user-claim-lead.repository';
import {
  UserClaimLead,
  CreateUserClaimLeadDTO,
  UpdateUserClaimLeadDTO,
  UserClaimLeadResponseDTO,
  UserClaimLeadFilters,
} from '@/types/user-claim-lead.types';

/**
 * User Claim Lead Service
 *
 * Contains all business logic related to user claim lead junction management.
 * Links user claims to specific leads (many-to-many relationship).
 * Uses UserClaimLeadRepository for data access operations.
 */
export class UserClaimLeadService {
  /**
   * Get user claim lead by ID
   */
  async getUserClaimLeadById(id: string): Promise<UserClaimLeadResponseDTO | null> {
    const userClaimLead = await userClaimLeadRepository.findById(id);
    return userClaimLead ? this.mapToResponseDTO(userClaimLead) : null;
  }

  /**
   * Get all user claim leads with optional filters
   */
  async getAllUserClaimLeads(filters?: UserClaimLeadFilters): Promise<UserClaimLeadResponseDTO[]> {
    const userClaimLeads = await userClaimLeadRepository.findAll(filters);
    return userClaimLeads.map(junction => this.mapToResponseDTO(junction));
  }

  /**
   * Get all leads for a specific user claim
   */
  async getLeadsForUserClaim(userClaimId: string): Promise<UserClaimLeadResponseDTO[]> {
    const userClaimLeads = await userClaimLeadRepository.findByUserClaimId(userClaimId);
    return userClaimLeads.map(junction => this.mapToResponseDTO(junction));
  }

  /**
   * Get all claims for a specific lead
   */
  async getClaimsForLead(leadId: string): Promise<UserClaimLeadResponseDTO[]> {
    const userClaimLeads = await userClaimLeadRepository.findByLeadId(leadId);
    return userClaimLeads.map(junction => this.mapToResponseDTO(junction));
  }

  /**
   * Check if a specific claim-lead relationship exists
   */
  async claimLeadRelationshipExists(userClaimId: string, leadId: string): Promise<boolean> {
    return await userClaimLeadRepository.existsByClaimAndLead(userClaimId, leadId);
  }

  /**
   * Create a new user claim lead junction
   */
  async createUserClaimLead(data: CreateUserClaimLeadDTO): Promise<UserClaimLeadResponseDTO> {
    // Validate input
    this.validateCreateData(data);

    // Check if relationship already exists
    const exists = await userClaimLeadRepository.existsByClaimAndLead(
      data.user_claim_id,
      data.lead_id
    );

    if (exists) {
      throw new Error('This claim-lead relationship already exists');
    }

    // Create junction
    const userClaimLead = await userClaimLeadRepository.create(data);

    return this.mapToResponseDTO(userClaimLead);
  }

  /**
   * Bulk create user claim leads
   */
  async createManyUserClaimLeads(data: CreateUserClaimLeadDTO[]): Promise<UserClaimLeadResponseDTO[]> {
    // Validate all data
    data.forEach(item => this.validateCreateData(item));

    // Check for duplicates in the input
    const uniqueKeys = new Set(data.map(d => `${d.user_claim_id}-${d.lead_id}`));
    if (uniqueKeys.size !== data.length) {
      throw new Error('Duplicate claim-lead relationships detected in input');
    }

    // Create all junctions
    const created = await userClaimLeadRepository.createMany(data);

    return created.map(junction => this.mapToResponseDTO(junction));
  }

  /**
   * Link multiple leads to a user claim
   */
  async linkLeadsToUserClaim(userClaimId: string, leadIds: string[]): Promise<UserClaimLeadResponseDTO[]> {
    if (!userClaimId) {
      throw new Error('User claim ID is required');
    }

    if (!leadIds || leadIds.length === 0) {
      throw new Error('At least one lead ID is required');
    }

    // Create junction entries for all leads
    const data: CreateUserClaimLeadDTO[] = leadIds.map(leadId => ({
      user_claim_id: userClaimId,
      lead_id: leadId,
    }));

    return await this.createManyUserClaimLeads(data);
  }

  /**
   * Update user claim lead (rarely used for junction tables)
   */
  async updateUserClaimLead(id: string, data: UpdateUserClaimLeadDTO): Promise<UserClaimLeadResponseDTO> {
    // Check if junction exists
    const exists = await userClaimLeadRepository.exists(id);
    if (!exists) {
      throw new Error('User claim lead junction not found');
    }

    // Update junction
    const updated = await userClaimLeadRepository.update(id, data);
    if (!updated) {
      throw new Error('Failed to update user claim lead junction');
    }

    return this.mapToResponseDTO(updated);
  }

  /**
   * Delete user claim lead junction
   */
  async deleteUserClaimLead(id: string): Promise<boolean> {
    // Check if junction exists
    const exists = await userClaimLeadRepository.exists(id);
    if (!exists) {
      throw new Error('User claim lead junction not found');
    }

    return await userClaimLeadRepository.delete(id);
  }

  /**
   * Delete all junctions for a specific user claim
   */
  async deleteAllLeadsForUserClaim(userClaimId: string): Promise<boolean> {
    if (!userClaimId) {
      throw new Error('User claim ID is required');
    }

    return await userClaimLeadRepository.deleteByUserClaimId(userClaimId);
  }

  /**
   * Delete all junctions for a specific lead
   */
  async deleteAllClaimsForLead(leadId: string): Promise<boolean> {
    if (!leadId) {
      throw new Error('Lead ID is required');
    }

    return await userClaimLeadRepository.deleteByLeadId(leadId);
  }

  /**
   * Count user claim leads with optional filters
   */
  async countUserClaimLeads(filters?: UserClaimLeadFilters): Promise<number> {
    return await userClaimLeadRepository.count(filters);
  }

  /**
   * Get count of leads for a specific claim
   */
  async getLeadCountForClaim(userClaimId: string): Promise<number> {
    return await userClaimLeadRepository.count({ user_claim_id: userClaimId });
  }

  /**
   * Get count of claims for a specific lead
   */
  async getClaimCountForLead(leadId: string): Promise<number> {
    return await userClaimLeadRepository.count({ lead_id: leadId });
  }

  /**
   * Validate create data
   */
  private validateCreateData(data: CreateUserClaimLeadDTO): void {
    if (!data.user_claim_id) {
      throw new Error('User claim ID is required');
    }

    if (!data.lead_id) {
      throw new Error('Lead ID is required');
    }
  }

  /**
   * Map UserClaimLead entity to response DTO
   */
  private mapToResponseDTO(userClaimLead: UserClaimLead): UserClaimLeadResponseDTO {
    return {
      id: userClaimLead.id,
      user_claim_id: userClaimLead.user_claim_id,
      lead_id: userClaimLead.lead_id,
      created_at: userClaimLead.created_at,
      updated_at: userClaimLead.updated_at,
    };
  }
}

// Export singleton instance
export const userClaimLeadService = new UserClaimLeadService();
