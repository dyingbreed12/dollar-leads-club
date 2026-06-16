import { leadBatchRepository } from '@/repositories/lead-batch.repository';
import {
  LeadBatch,
  CreateLeadBatchDTO,
  UpdateLeadBatchDTO,
  LeadBatchResponseDTO,
  LeadBatchFilters,
  LeadType,
} from '@/types/lead-batch.types';

/**
 * Lead Batch Service
 *
 * Contains all business logic related to lead batch management.
 * Uses LeadBatchRepository for data access operations.
 */
export class LeadBatchService {
  /**
   * Get lead batch by ID
   */
  async getLeadBatchById(id: string): Promise<LeadBatchResponseDTO | null> {
    const leadBatch = await leadBatchRepository.findById(id);
    return leadBatch ? this.mapToResponseDTO(leadBatch) : null;
  }

  /**
   * Get all lead batches with optional filters
   */
  async getAllLeadBatches(filters?: LeadBatchFilters): Promise<LeadBatchResponseDTO[]> {
    const leadBatches = await leadBatchRepository.findAll(filters);
    return leadBatches.map(batch => this.mapToResponseDTO(batch));
  }

  /**
   * Get lead batches by user ID
   */
  async getLeadBatchesByUserId(userId: string): Promise<LeadBatchResponseDTO[]> {
    const leadBatches = await leadBatchRepository.findByUserId(userId);
    return leadBatches.map(batch => this.mapToResponseDTO(batch));
  }

  /**
   * Get lead batches by type
   */
  async getLeadBatchesByType(type: LeadType): Promise<LeadBatchResponseDTO[]> {
    const leadBatches = await leadBatchRepository.findByType(type);
    return leadBatches.map(batch => this.mapToResponseDTO(batch));
  }

  /**
   * Create a new lead batch
   */
  async createLeadBatch(data: CreateLeadBatchDTO): Promise<LeadBatchResponseDTO> {
    // Validate input
    this.validateCreateData(data);

    // Verify user exists (you might want to add userRepository check here)

    // Create lead batch
    const leadBatch = await leadBatchRepository.create(data);

    return this.mapToResponseDTO(leadBatch);
  }

  /**
   * Update lead batch
   */
  async updateLeadBatch(id: string, data: UpdateLeadBatchDTO): Promise<LeadBatchResponseDTO> {
    // Check if lead batch exists
    const exists = await leadBatchRepository.exists(id);
    if (!exists) {
      throw new Error('Lead batch not found');
    }

    // Update lead batch
    const updated = await leadBatchRepository.update(id, data);
    if (!updated) {
      throw new Error('Failed to update lead batch');
    }

    return this.mapToResponseDTO(updated);
  }

  /**
   * Delete lead batch
   */
  async deleteLeadBatch(id: string): Promise<boolean> {
    // Check if lead batch exists
    const exists = await leadBatchRepository.exists(id);
    if (!exists) {
      throw new Error('Lead batch not found');
    }

    return await leadBatchRepository.delete(id);
  }

  /**
   * Count lead batches with optional filters
   */
  async countLeadBatches(filters?: LeadBatchFilters): Promise<number> {
    return await leadBatchRepository.count(filters);
  }

  /**
   * Get user's lead batch statistics
   */
  async getUserBatchStatistics(userId: string): Promise<{
    totalBatches: number;
    totalLeads: number;
    totalImported: number;
    totalSkipped: number;
    dollarLeadBatches: number;
    diamondLeadBatches: number;
  }> {
    const batches = await leadBatchRepository.findByUserId(userId);

    return {
      totalBatches: batches.length,
      totalLeads: batches.reduce((sum, batch) => sum + batch.total_leads, 0),
      totalImported: batches.reduce((sum, batch) => sum + batch.imported_leads, 0),
      totalSkipped: batches.reduce((sum, batch) => sum + batch.skipped_duplicates, 0),
      dollarLeadBatches: batches.filter(batch => batch.type === 'dollar-lead').length,
      diamondLeadBatches: batches.filter(batch => batch.type === 'diamond-lead').length,
    };
  }

  /**
   * Validate create data
   */
  private validateCreateData(data: CreateLeadBatchDTO): void {
    if (!data.user_id) {
      throw new Error('User ID is required');
    }

    if (!data.batch_name || data.batch_name.trim().length === 0) {
      throw new Error('Batch name is required');
    }

    if (!data.type || !['dollar-lead', 'diamond-lead'].includes(data.type)) {
      throw new Error('Invalid lead type. Must be "dollar-lead" or "diamond-lead"');
    }

    if (data.total_leads < 0) {
      throw new Error('Total leads cannot be negative');
    }

    if (data.imported_leads < 0) {
      throw new Error('Imported leads cannot be negative');
    }

    if (data.imported_leads > data.total_leads) {
      throw new Error('Imported leads cannot exceed total leads');
    }

    if (!data.file_url || data.file_url.trim().length === 0) {
      throw new Error('File URL is required');
    }

    if (!data.file_name || data.file_name.trim().length === 0) {
      throw new Error('File name is required');
    }

    if (data.file_size <= 0) {
      throw new Error('File size must be greater than 0');
    }
  }

  /**
   * Map LeadBatch entity to response DTO
   */
  private mapToResponseDTO(leadBatch: LeadBatch): LeadBatchResponseDTO {
    return {
      id: leadBatch.id,
      user_id: leadBatch.user_id,
      batch_name: leadBatch.batch_name,
      type: leadBatch.type,
      total_leads: leadBatch.total_leads,
      imported_leads: leadBatch.imported_leads,
      skipped_duplicates: leadBatch.skipped_duplicates,
      skipped_leads: leadBatch.skipped_leads,
      file_url: leadBatch.file_url,
      file_name: leadBatch.file_name,
      file_size: leadBatch.file_size,
      created_at: leadBatch.created_at,
      updated_at: leadBatch.updated_at,
    };
  }
}

// Export singleton instance
export const leadBatchService = new LeadBatchService();
