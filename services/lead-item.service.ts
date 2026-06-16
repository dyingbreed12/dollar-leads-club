import { leadItemRepository } from '@/repositories/lead-item.repository';
import {
  LeadItem,
  CreateLeadItemDTO,
  UpdateLeadItemDTO,
  LeadItemResponseDTO,
  LeadItemFilters,
} from '@/types/lead-item.types';
import { LeadType } from '@/types/lead-batch.types';

/**
 * Lead Item Service
 *
 * Contains all business logic related to lead item management.
 * Supports both file-based lead packages (legacy) and individual shop leads.
 * Uses LeadItemRepository for data access operations.
 */
export class LeadItemService {
  /**
   * Get lead item by ID
   */
  async getLeadItemById(id: string): Promise<LeadItemResponseDTO | null> {
    const leadItem = await leadItemRepository.findById(id);
    return leadItem ? this.mapToResponseDTO(leadItem) : null;
  }

  /**
   * Get all lead items with optional filters
   */
  async getAllLeadItems(filters?: LeadItemFilters): Promise<LeadItemResponseDTO[]> {
    const leadItems = await leadItemRepository.findAll(filters);
    return leadItems.map(item => this.mapToResponseDTO(item));
  }

  /**
   * Get lead items by user ID
   */
  async getLeadItemsByUserId(userId: string): Promise<LeadItemResponseDTO[]> {
    const leadItems = await leadItemRepository.findByUserId(userId);
    return leadItems.map(item => this.mapToResponseDTO(item));
  }

  /**
   * Get active lead items
   */
  async getActiveLeadItems(filters?: LeadItemFilters): Promise<LeadItemResponseDTO[]> {
    const leadItems = await leadItemRepository.findActive(filters);
    return leadItems.map(item => this.mapToResponseDTO(item));
  }

  /**
   * Get package leads (file-based)
   */
  async getPackageLeads(filters?: LeadItemFilters): Promise<LeadItemResponseDTO[]> {
    const leadItems = await leadItemRepository.findPackages(filters);
    return leadItems.map(item => this.mapToResponseDTO(item));
  }

  /**
   * Get shop leads (individual leads)
   */
  async getShopLeads(filters?: LeadItemFilters): Promise<LeadItemResponseDTO[]> {
    const leadItems = await leadItemRepository.findShopLeads(filters);
    return leadItems.map(item => this.mapToResponseDTO(item));
  }

  /**
   * Get lead items by location
   */
  async getLeadItemsByLocation(state?: string, city?: string, zipCode?: string): Promise<LeadItemResponseDTO[]> {
    const leadItems = await leadItemRepository.findByLocation(state, city, zipCode);
    return leadItems.map(item => this.mapToResponseDTO(item));
  }

  /**
   * Create a new package lead (file-based)
   */
  async createPackageLead(data: CreateLeadItemDTO): Promise<LeadItemResponseDTO> {
    // Validate as package lead
    this.validatePackageLeadData(data);

    // Create lead item
    const leadItem = await leadItemRepository.create(data);

    return this.mapToResponseDTO(leadItem);
  }

  /**
   * Create a new shop lead (individual)
   */
  async createShopLead(data: CreateLeadItemDTO): Promise<LeadItemResponseDTO> {
    // Validate as shop lead
    this.validateShopLeadData(data);

    // Create lead item
    const leadItem = await leadItemRepository.create(data);

    return this.mapToResponseDTO(leadItem);
  }

  /**
   * Create a new lead item (generic)
   */
  async createLeadItem(data: CreateLeadItemDTO): Promise<LeadItemResponseDTO> {
    // Validate basic fields
    this.validateBasicData(data);

    // Create lead item
    const leadItem = await leadItemRepository.create(data);

    return this.mapToResponseDTO(leadItem);
  }

  /**
   * Update lead item
   */
  async updateLeadItem(id: string, data: UpdateLeadItemDTO): Promise<LeadItemResponseDTO> {
    // Check if lead item exists
    const exists = await leadItemRepository.exists(id);
    if (!exists) {
      throw new Error('Lead item not found');
    }

    // Update lead item
    const updated = await leadItemRepository.update(id, data);
    if (!updated) {
      throw new Error('Failed to update lead item');
    }

    return this.mapToResponseDTO(updated);
  }

  /**
   * Increment view count for a lead item
   */
  async incrementViews(id: string): Promise<LeadItemResponseDTO> {
    const updated = await leadItemRepository.incrementViews(id);
    if (!updated) {
      throw new Error('Lead item not found');
    }

    return this.mapToResponseDTO(updated);
  }

  /**
   * Deactivate a lead item
   */
  async deactivateLeadItem(id: string): Promise<LeadItemResponseDTO> {
    const updated = await leadItemRepository.deactivate(id);
    if (!updated) {
      throw new Error('Lead item not found');
    }

    return this.mapToResponseDTO(updated);
  }

  /**
   * Activate a lead item
   */
  async activateLeadItem(id: string): Promise<LeadItemResponseDTO> {
    const updated = await leadItemRepository.activate(id);
    if (!updated) {
      throw new Error('Lead item not found');
    }

    return this.mapToResponseDTO(updated);
  }

  /**
   * Delete lead item
   */
  async deleteLeadItem(id: string): Promise<boolean> {
    // Check if lead item exists
    const exists = await leadItemRepository.exists(id);
    if (!exists) {
      throw new Error('Lead item not found');
    }

    return await leadItemRepository.delete(id);
  }

  /**
   * Count lead items with optional filters
   */
  async countLeadItems(filters?: LeadItemFilters): Promise<number> {
    return await leadItemRepository.count(filters);
  }

  /**
   * Get lead item statistics
   */
  async getLeadItemStatistics(filters?: LeadItemFilters): Promise<{
    total: number;
    active: number;
    inactive: number;
    packages: number;
    shopLeads: number;
    totalViews: number;
    averagePrice: number;
    dollarLeads: number;
    diamondLeads: number;
  }> {
    const items = await leadItemRepository.findAll(filters);

    const stats = {
      total: items.length,
      active: items.filter(i => i.is_active).length,
      inactive: items.filter(i => !i.is_active).length,
      packages: items.filter(i => i.is_package).length,
      shopLeads: items.filter(i => i.is_shop_lead).length,
      totalViews: items.reduce((sum, i) => sum + i.views, 0),
      averagePrice: 0,
      dollarLeads: items.filter(i => i.type === 'dollar-lead').length,
      diamondLeads: items.filter(i => i.type === 'diamond-lead').length,
    };

    if (items.length > 0) {
      stats.averagePrice = items.reduce((sum, i) => sum + i.price, 0) / items.length;
    }

    return stats;
  }

  /**
   * Get user's lead item statistics
   */
  async getUserLeadItemStatistics(userId: string): Promise<{
    total: number;
    active: number;
    packages: number;
    shopLeads: number;
    totalViews: number;
    totalLeadsInPackages: number;
  }> {
    const items = await leadItemRepository.findByUserId(userId);

    return {
      total: items.length,
      active: items.filter(i => i.is_active).length,
      packages: items.filter(i => i.is_package).length,
      shopLeads: items.filter(i => i.is_shop_lead).length,
      totalViews: items.reduce((sum, i) => sum + i.views, 0),
      totalLeadsInPackages: items
        .filter(i => i.is_package)
        .reduce((sum, i) => sum + i.lead_count, 0),
    };
  }

  /**
   * Validate basic data (required for all lead items)
   */
  private validateBasicData(data: CreateLeadItemDTO): void {
    if (!data.user_id) {
      throw new Error('User ID is required');
    }

    if (!data.type || !['dollar-lead', 'diamond-lead'].includes(data.type)) {
      throw new Error('Invalid lead type. Must be "dollar-lead" or "diamond-lead"');
    }
  }

  /**
   * Validate package lead data
   */
  private validatePackageLeadData(data: CreateLeadItemDTO): void {
    this.validateBasicData(data);

    if (!data.file_url || data.file_url.trim().length === 0) {
      throw new Error('File URL is required for package leads');
    }

    if (!data.file_name || data.file_name.trim().length === 0) {
      throw new Error('File name is required for package leads');
    }

    if (data.lead_count !== undefined && data.lead_count < 0) {
      throw new Error('Lead count cannot be negative');
    }

    if (data.file_size_bytes !== undefined && data.file_size_bytes !== null && data.file_size_bytes <= 0) {
      throw new Error('File size must be greater than 0');
    }
  }

  /**
   * Validate shop lead data
   */
  private validateShopLeadData(data: CreateLeadItemDTO): void {
    this.validateBasicData(data);

    if (!data.address || data.address.trim().length === 0) {
      throw new Error('Address is required for shop leads');
    }

    if (data.price !== undefined && data.price < 0) {
      throw new Error('Price cannot be negative');
    }
  }

  /**
   * Map LeadItem entity to response DTO
   */
  private mapToResponseDTO(leadItem: LeadItem): LeadItemResponseDTO {
    return {
      id: leadItem.id,
      user_id: leadItem.user_id,
      title: leadItem.title,
      type: leadItem.type,
      lead_count: leadItem.lead_count,
      file_name: leadItem.file_name,
      file_url: leadItem.file_url,
      file_size_bytes: leadItem.file_size_bytes,
      package_date: leadItem.package_date,
      address: leadItem.address,
      location: leadItem.location,
      price: leadItem.price,
      lead_gen: leadItem.lead_gen,
      property_type: leadItem.property_type,
      state: leadItem.state,
      city: leadItem.city,
      zip_code: leadItem.zip_code,
      is_active: leadItem.is_active,
      views: leadItem.views,
      is_package: leadItem.is_package,
      is_shop_lead: leadItem.is_shop_lead,
      created_at: leadItem.created_at,
      updated_at: leadItem.updated_at,
    };
  }
}

// Export singleton instance
export const leadItemService = new LeadItemService();
