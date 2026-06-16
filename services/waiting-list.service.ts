import { waitingListRepository } from '@/repositories/waiting-list.repository';
import {
  WaitingList,
  CreateWaitingListDTO,
  WaitingListResponseDTO,
  WaitingListFilters,
  PaginationOptions,
  PaginatedResponse,
} from '@/types/waiting-list-types';

/**
 * Waiting List Service
 *
 * Contains all business logic related to waiting list management.
 * Uses WaitingListRepository for data access operations.
 */
export class WaitingListService {
  /**
   * Add a new entry to the waiting list
   */
  async addToWaitingList(data: CreateWaitingListDTO): Promise<WaitingListResponseDTO> {
    // Validate input
    this.validateFirstName(data.first_name);
    this.validateLastName(data.last_name);
    this.validateEmail(data.email_address);

    // Validate phone number if provided
    if (data.phone_number) {
      this.validatePhoneNumber(data.phone_number);
    }

    // Check if email already exists in waiting list
    const existingEntry = await waitingListRepository.findByEmail(data.email_address);
    if (existingEntry) {
      throw new Error('This email is already on the waiting list');
    }

    // Create waiting list entry
    const entry = await waitingListRepository.create(data);

    return this.mapToResponseDTO(entry);
  }

  /**
   * Get waiting list entry by ID
   */
  async getById(id: string): Promise<WaitingListResponseDTO | null> {
    const entry = await waitingListRepository.findById(id);

    if (!entry) {
      return null;
    }

    return this.mapToResponseDTO(entry);
  }

  /**
   * Get waiting list entry by email
   */
  async getByEmail(email: string): Promise<WaitingListResponseDTO | null> {
    const entry = await waitingListRepository.findByEmail(email);

    if (!entry) {
      return null;
    }

    return this.mapToResponseDTO(entry);
  }

  /**
   * Get all waiting list entries with optional filters
   */
  async getAll(
    filters?: WaitingListFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<WaitingListResponseDTO>> {
    // Get entries with pagination
    const entries = await waitingListRepository.findAll(filters, pagination);

    // Get total count for pagination
    const total = await waitingListRepository.count(filters);

    // Calculate pagination metadata
    const page = pagination?.page || 1;
    const limit = pagination?.limit || total;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    return {
      data: entries.map((entry) => this.mapToResponseDTO(entry)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get waiting list count
   */
  async getCount(filters?: WaitingListFilters): Promise<number> {
    return await waitingListRepository.count(filters);
  }

  /**
   * Check if email exists in waiting list
   */
  async emailExists(email: string): Promise<boolean> {
    return await waitingListRepository.existsByEmail(email);
  }

  /**
   * Delete waiting list entry
   */
  async delete(id: string): Promise<boolean> {
    return await waitingListRepository.delete(id);
  }

  // Private helper methods

  /**
   * Validate first name
   */
  private validateFirstName(firstName: string): void {
    if (!firstName || firstName.trim().length === 0) {
      throw new Error('First name is required');
    }

    if (firstName.trim().length < 2) {
      throw new Error('First name must be at least 2 characters long');
    }

    if (firstName.trim().length > 100) {
      throw new Error('First name must not exceed 100 characters');
    }
  }

  /**
   * Validate last name
   */
  private validateLastName(lastName: string): void {
    if (!lastName || lastName.trim().length === 0) {
      throw new Error('Last name is required');
    }

    if (lastName.trim().length < 2) {
      throw new Error('Last name must be at least 2 characters long');
    }

    if (lastName.trim().length > 100) {
      throw new Error('Last name must not exceed 100 characters');
    }
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new Error('Email address is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    if (email.length > 255) {
      throw new Error('Email address must not exceed 255 characters');
    }
  }

  /**
   * Validate phone number format (optional field)
   */
  private validatePhoneNumber(phoneNumber: string): void {
    // Allow various phone number formats
    // This is a basic validation - adjust regex based on your requirements
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;

    if (!phoneRegex.test(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    if (phoneNumber.length < 7) {
      throw new Error('Phone number must be at least 7 characters long');
    }

    if (phoneNumber.length > 20) {
      throw new Error('Phone number must not exceed 20 characters');
    }
  }

  /**
   * Map WaitingList entity to WaitingListResponseDTO
   */
  private mapToResponseDTO(entry: WaitingList): WaitingListResponseDTO {
    return {
      id: entry.id,
      first_name: entry.first_name,
      last_name: entry.last_name,
      phone_number: entry.phone_number,
      email_address: entry.email_address,
      created_at: entry.created_at,
    };
  }
}

// Export singleton instance
export const waitingListService = new WaitingListService();