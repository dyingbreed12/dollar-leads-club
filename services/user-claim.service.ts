import { userClaimRepository } from '@/repositories/user-claim.repository';
import {
  UserClaim,
  CreateUserClaimDTO,
  UpdateUserClaimDTO,
  UserClaimResponseDTO,
  UserClaimFilters,
} from '@/types/user-claim.types';
import { LeadType } from '@/types/lead-batch.types';

/**
 * User Claim Service
 *
 * Contains all business logic related to user claim management.
 * Uses UserClaimRepository for data access operations.
 */
export class UserClaimService {
  /**
   * Get user claim by ID
   */
  async getUserClaimById(id: string): Promise<UserClaimResponseDTO | null> {
    const userClaim = await userClaimRepository.findById(id);
    return userClaim ? this.mapToResponseDTO(userClaim) : null;
  }

  /**
   * Get all user claims with optional filters
   */
  async getAllUserClaims(filters?: UserClaimFilters): Promise<UserClaimResponseDTO[]> {
    const userClaims = await userClaimRepository.findAll(filters);
    return userClaims.map(claim => this.mapToResponseDTO(claim));
  }

  /**
   * Get user claims by user ID
   */
  async getUserClaimsByUserId(userId: string): Promise<UserClaimResponseDTO[]> {
    const userClaims = await userClaimRepository.findByUserId(userId);
    return userClaims.map(claim => this.mapToResponseDTO(claim));
  }

  /**
   * Get user claims by type
   */
  async getUserClaimsByType(type: LeadType): Promise<UserClaimResponseDTO[]> {
    const userClaims = await userClaimRepository.findByType(type);
    return userClaims.map(claim => this.mapToResponseDTO(claim));
  }

  /**
   * Get unviewed claims for a user
   */
  async getUnviewedClaimsByUser(userId: string): Promise<UserClaimResponseDTO[]> {
    const userClaims = await userClaimRepository.findUnviewedByUser(userId);
    return userClaims.map(claim => this.mapToResponseDTO(claim));
  }

  /**
   * Get undownloaded claims for a user
   */
  async getUndownloadedClaimsByUser(userId: string): Promise<UserClaimResponseDTO[]> {
    const userClaims = await userClaimRepository.findUndownloadedByUser(userId);
    return userClaims.map(claim => this.mapToResponseDTO(claim));
  }

  /**
   * Create a new user claim
   */
  async createUserClaim(data: CreateUserClaimDTO): Promise<UserClaimResponseDTO> {
    // Validate input
    this.validateCreateData(data);

    // Create user claim
    const userClaim = await userClaimRepository.create(data);

    return this.mapToResponseDTO(userClaim);
  }

  /**
   * Update user claim
   */
  async updateUserClaim(id: string, data: UpdateUserClaimDTO): Promise<UserClaimResponseDTO> {
    // Check if user claim exists
    const exists = await userClaimRepository.exists(id);
    if (!exists) {
      throw new Error('User claim not found');
    }

    // Update user claim
    const updated = await userClaimRepository.update(id, data);
    if (!updated) {
      throw new Error('Failed to update user claim');
    }

    return this.mapToResponseDTO(updated);
  }

  /**
   * Mark claim as viewed
   */
  async markClaimAsViewed(id: string): Promise<UserClaimResponseDTO> {
    // Check if user claim exists
    const claim = await userClaimRepository.findById(id);
    if (!claim) {
      throw new Error('User claim not found');
    }

    // If already viewed, return current state
    if (claim.viewed) {
      return this.mapToResponseDTO(claim);
    }

    // Mark as viewed
    const updated = await userClaimRepository.markAsViewed(id);
    if (!updated) {
      throw new Error('Failed to mark claim as viewed');
    }

    return this.mapToResponseDTO(updated);
  }

  /**
   * Mark claim as downloaded
   */
  async markClaimAsDownloaded(id: string): Promise<UserClaimResponseDTO> {
    // Check if user claim exists
    const claim = await userClaimRepository.findById(id);
    if (!claim) {
      throw new Error('User claim not found');
    }

    // If already downloaded, return current state
    if (claim.downloaded) {
      return this.mapToResponseDTO(claim);
    }

    // Mark as downloaded
    const updated = await userClaimRepository.markAsDownloaded(id);
    if (!updated) {
      throw new Error('Failed to mark claim as downloaded');
    }

    return this.mapToResponseDTO(updated);
  }

  /**
   * Delete user claim
   */
  async deleteUserClaim(id: string): Promise<boolean> {
    // Check if user claim exists
    const exists = await userClaimRepository.exists(id);
    if (!exists) {
      throw new Error('User claim not found');
    }

    return await userClaimRepository.delete(id);
  }

  /**
   * Count user claims with optional filters
   */
  async countUserClaims(filters?: UserClaimFilters): Promise<number> {
    return await userClaimRepository.count(filters);
  }

  /**
   * Get user claim statistics
   */
  async getUserClaimStatistics(userId: string): Promise<{
    totalClaims: number;
    totalLeadsClaimed: number;
    viewedClaims: number;
    unviewedClaims: number;
    downloadedClaims: number;
    undownloadedClaims: number;
    dollarLeadClaims: number;
    diamondLeadClaims: number;
  }> {
    const claims = await userClaimRepository.findByUserId(userId);

    return {
      totalClaims: claims.length,
      totalLeadsClaimed: claims.reduce((sum, claim) => sum + claim.lead_count, 0),
      viewedClaims: claims.filter(c => c.viewed).length,
      unviewedClaims: claims.filter(c => !c.viewed).length,
      downloadedClaims: claims.filter(c => c.downloaded).length,
      undownloadedClaims: claims.filter(c => !c.downloaded).length,
      dollarLeadClaims: claims.filter(c => c.type === 'dollar-lead').length,
      diamondLeadClaims: claims.filter(c => c.type === 'diamond-lead').length,
    };
  }

  /**
   * Validate create data
   */
  private validateCreateData(data: CreateUserClaimDTO): void {
    if (!data.user_id) {
      throw new Error('User ID is required');
    }

    if (!data.type || !['dollar-lead', 'diamond-lead'].includes(data.type)) {
      throw new Error('Invalid lead type. Must be "dollar-lead" or "diamond-lead"');
    }

    if (!data.lead_count || data.lead_count <= 0) {
      throw new Error('Lead count must be greater than 0');
    }
  }

  /**
   * Map UserClaim entity to response DTO
   */
  private mapToResponseDTO(userClaim: UserClaim): UserClaimResponseDTO {
    return {
      id: userClaim.id,
      user_id: userClaim.user_id,
      type: userClaim.type,
      claimed_at: userClaim.claimed_at,
      lead_count: userClaim.lead_count,
      viewed: userClaim.viewed,
      viewed_at: userClaim.viewed_at,
      downloaded: userClaim.downloaded,
      downloaded_at: userClaim.downloaded_at,
      source: userClaim.source,
      pack_name: userClaim.pack_name,
      stripe_session_id: userClaim.stripe_session_id,
      created_at: userClaim.created_at,
      updated_at: userClaim.updated_at,
    };
  }
}

// Export singleton instance
export const userClaimService = new UserClaimService();
