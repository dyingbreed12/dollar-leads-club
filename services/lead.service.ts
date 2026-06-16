import { leadRepository } from '@/repositories/lead.repository';
import {
  Lead,
  CreateLeadDTO,
  UpdateLeadDTO,
  LeadResponseDTO,
  LeadFilters,
  LeadStatus,
  LeadType,
} from '@/types/lead.types';

/**
 * Lead Service
 *
 * Contains all business logic related to lead management.
 * Uses LeadRepository for data access operations.
 */
export class LeadService {
  /**
   * Get lead by ID
   */
  async getLeadById(id: string): Promise<LeadResponseDTO | null> {
    const lead = await leadRepository.findById(id);
    return lead ? this.mapToResponseDTO(lead) : null;
  }

  /**
   * Get all leads with optional filters
   */
  async getAllLeads(filters?: LeadFilters): Promise<LeadResponseDTO[]> {
    const leads = await leadRepository.findAll(filters);
    return leads.map(lead => this.mapToResponseDTO(lead));
  }

  /**
   * Get all leads with pagination and optional filters
   */
  async getAllLeadsWithPagination(
    filters?: LeadFilters,
    pagination?: { limit: number; offset: number }
  ): Promise<{ data: LeadResponseDTO[]; total: number }> {
    const result = await leadRepository.findAllWithPagination(filters, pagination);
    return {
      data: result.data.map(lead => this.mapToResponseDTO(lead)),
      total: result.total,
    };
  }

  /**
   * Get leads by batch ID
   */
  async getLeadsByBatchId(batchId: string): Promise<LeadResponseDTO[]> {
    const leads = await leadRepository.findByBatchId(batchId);
    return leads.map(lead => this.mapToResponseDTO(lead));
  }

  /**
   * Get leads by status
   */
  async getLeadsByStatus(status: LeadStatus): Promise<LeadResponseDTO[]> {
    const leads = await leadRepository.findByStatus(status);
    return leads.map(lead => this.mapToResponseDTO(lead));
  }

  /**
   * Get available leads by type
   */
  async getAvailableLeadsByType(type: LeadType, limit?: number): Promise<LeadResponseDTO[]> {
    const leads = await leadRepository.findAvailableByType(type, limit);
    return leads.map(lead => this.mapToResponseDTO(lead));
  }

  /**
   * Get leads claimed by user
   */
  async getLeadsClaimedByUser(userId: string): Promise<LeadResponseDTO[]> {
    const leads = await leadRepository.findClaimedByUser(userId);
    return leads.map(lead => this.mapToResponseDTO(lead));
  }

  /**
   * Search leads using full-text search
   */
  async searchLeads(query: string): Promise<LeadResponseDTO[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    const leads = await leadRepository.search(query);
    return leads.map(lead => this.mapToResponseDTO(lead));
  }

  /**
   * Search leads with pagination using full-text search
   */
  async searchLeadsWithPagination(
    query: string,
    pagination?: { limit: number; offset: number }
  ): Promise<{ data: LeadResponseDTO[]; total: number }> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    const result = await leadRepository.searchWithPagination(query, pagination);
    return {
      data: result.data.map(lead => this.mapToResponseDTO(lead)),
      total: result.total,
    };
  }

  /**
   * Create a new lead
   */
  async createLead(data: CreateLeadDTO): Promise<LeadResponseDTO> {
    // Validate input
    this.validateCreateData(data);

    // Create lead
    const lead = await leadRepository.create(data);

    return this.mapToResponseDTO(lead);
  }

  /**
   * Bulk create leads
   */
  async createManyLeads(leads: CreateLeadDTO[]): Promise<LeadResponseDTO[]> {
    // Validate all leads
    leads.forEach(lead => this.validateCreateData(lead));

    // Create all leads
    const createdLeads = await leadRepository.createMany(leads);

    return createdLeads.map(lead => this.mapToResponseDTO(lead));
  }

  /**
   * Update lead
   */
  async updateLead(id: string, data: UpdateLeadDTO): Promise<LeadResponseDTO> {
    // Check if lead exists
    const exists = await leadRepository.exists(id);
    if (!exists) {
      throw new Error('Lead not found');
    }

    // Update lead
    const updated = await leadRepository.update(id, data);
    if (!updated) {
      throw new Error('Failed to update lead');
    }

    return this.mapToResponseDTO(updated);
  }

  /**
   * Claim a lead for a user
   */
  async claimLead(leadId: string, userId: string): Promise<LeadResponseDTO> {
    // Check if lead exists
    const lead = await leadRepository.findById(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    // Check if lead is available
    if (lead.status !== 'available') {
      throw new Error('Lead is not available for claiming');
    }

    // Claim the lead
    const claimed = await leadRepository.claimLead(leadId, userId);
    if (!claimed) {
      throw new Error('Failed to claim lead');
    }

    return this.mapToResponseDTO(claimed);
  }

  /**
   * Unclaim a lead (make it available again)
   */
  async unclaimLead(leadId: string, userId: string): Promise<LeadResponseDTO> {
    // Check if lead exists
    const lead = await leadRepository.findById(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    // Check if the user owns this claim
    if (lead.claimed_by !== userId) {
      throw new Error('You do not have permission to unclaim this lead');
    }

    // Unclaim the lead
    const unclaimed = await leadRepository.unclaimLead(leadId);
    if (!unclaimed) {
      throw new Error('Failed to unclaim lead');
    }

    return this.mapToResponseDTO(unclaimed);
  }

  /**
   * Mark lead as expired
   */
  async markLeadAsExpired(leadId: string): Promise<LeadResponseDTO> {
    return await this.updateLead(leadId, { status: 'expired' });
  }

  /**
   * Delete lead
   */
  async deleteLead(id: string): Promise<boolean> {
    // Check if lead exists
    const exists = await leadRepository.exists(id);
    if (!exists) {
      throw new Error('Lead not found');
    }

    return await leadRepository.delete(id);
  }

  /**
   * Count leads with optional filters
   */
  async countLeads(filters?: LeadFilters): Promise<number> {
    return await leadRepository.count(filters);
  }

  /**
   * Get lead statistics
   */
  async getLeadStatistics(filters?: LeadFilters): Promise<{
    total: number;
    available: number;
    claimed: number;
    expired: number;
    averageEstimate: number;
    averageMao: number;
    averageOfferPrice: number;
  }> {
    const leads = await leadRepository.findAll(filters);

    const stats = {
      total: leads.length,
      available: leads.filter(l => l.status === 'available').length,
      claimed: leads.filter(l => l.status === 'claimed').length,
      expired: leads.filter(l => l.status === 'expired').length,
      averageEstimate: 0,
      averageMao: 0,
      averageOfferPrice: 0,
    };

    if (leads.length > 0) {
      stats.averageEstimate = leads.reduce((sum, l) => sum + l.estimate, 0) / leads.length;
      stats.averageMao = leads.reduce((sum, l) => sum + l.mao, 0) / leads.length;
      stats.averageOfferPrice = leads.reduce((sum, l) => sum + l.offer_price, 0) / leads.length;
    }

    return stats;
  }

  /**
   * Get leads by location
   */
  async getLeadsByLocation(city?: string, state?: string, zipCode?: string): Promise<LeadResponseDTO[]> {
    const filters: LeadFilters = {};
    if (city) filters.city = city;
    if (state) filters.state = state;
    if (zipCode) filters.zip_code = zipCode;

    const leads = await leadRepository.findAll(filters);
    return leads.map(lead => this.mapToResponseDTO(lead));
  }

  /**
   * Validate create data
   */
  private validateCreateData(data: CreateLeadDTO): void {
    if (!data.lead_batch_id) {
      throw new Error('Lead batch ID is required');
    }

    if (!data.type || !['dollar-lead', 'diamond-lead'].includes(data.type)) {
      throw new Error('Invalid lead type. Must be "dollar-lead" or "diamond-lead"');
    }

    // Validate numeric fields
    if (data.estimate !== undefined && data.estimate < 0) {
      throw new Error('Estimate cannot be negative');
    }

    if (data.mao !== undefined && data.mao < 0) {
      throw new Error('MAO cannot be negative');
    }

    if (data.offer_price !== undefined && data.offer_price < 0) {
      throw new Error('Offer price cannot be negative');
    }

    // Validate email if provided
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email address');
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Map Lead entity to response DTO (excludes raw_data and search_vector)
   */
  private mapToResponseDTO(lead: Lead): LeadResponseDTO {
    return {
      id: lead.id,
      lead_batch_id: lead.lead_batch_id,
      type: lead.type,
      status: lead.status,
      claimed_by: lead.claimed_by,
      claimed_at: lead.claimed_at,
      full_name: lead.full_name,
      street_address: lead.street_address,
      city: lead.city,
      state: lead.state,
      zip_code: lead.zip_code,
      phone_number: lead.phone_number,
      email: lead.email,
      property_type: lead.property_type,
      lead_gen: lead.lead_gen,
      estimate: lead.estimate,
      mao: lead.mao,
      offer_price: lead.offer_price,
      avm: lead.avm,
      equity: lead.equity,
      market_status: lead.market_status,
      recording_url: lead.recording_url,
      notes: lead.notes,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
    };
  }
}

// Export singleton instance
export const leadService = new LeadService();
