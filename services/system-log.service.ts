import { systemLogRepository } from '@/repositories/system-log.repository';
import {
  SystemLogFilters,
  SystemLogPaginationOptions,
  PaginatedSystemLogResponse,
  SystemLogResponseDTO,
  CreateSystemLogDTO,
} from '@/types/system-log.types';

/**
 * System Log Service
 *
 * Handles business logic for system log operations.
 */
export class SystemLogService {
  /**
   * Get paginated system logs with optional filters
   */
  async getSystemLogs(
    filters?: SystemLogFilters,
    options?: SystemLogPaginationOptions
  ): Promise<PaginatedSystemLogResponse> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const total = await systemLogRepository.count(filters);

    // Get logs with pagination
    const logs = await systemLogRepository.findAll(filters, { limit, offset });

    // Map to response DTOs
    const data: SystemLogResponseDTO[] = logs.map((log) => ({
      id: log.id,
      event_type: log.event_type,
      event_data: log.event_data,
      created_at: log.created_at,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single system log by ID
   */
  async getSystemLogById(id: string): Promise<SystemLogResponseDTO | null> {
    const log = await systemLogRepository.findById(id);

    if (!log) {
      return null;
    }

    return {
      id: log.id,
      event_type: log.event_type,
      event_data: log.event_data,
      created_at: log.created_at,
    };
  }

  /**
   * Get all distinct event types
   */
  async getEventTypes(): Promise<string[]> {
    return systemLogRepository.getDistinctEventTypes();
  }

  /**
   * Create a new system log entry
   */
  async createLog(data: CreateSystemLogDTO): Promise<SystemLogResponseDTO> {
    const log = await systemLogRepository.create(data);

    return {
      id: log.id,
      event_type: log.event_type,
      event_data: log.event_data,
      created_at: log.created_at,
    };
  }

  /**
   * Delete a system log
   */
  async deleteLog(id: string): Promise<boolean> {
    return systemLogRepository.delete(id);
  }

  /**
   * Clean up old logs (older than specified days)
   */
  async cleanupOldLogs(days: number = 90): Promise<number> {
    return systemLogRepository.deleteOlderThan(days);
  }

  /**
   * Get total count of system logs
   */
  async getTotalCount(filters?: SystemLogFilters): Promise<number> {
    return systemLogRepository.count(filters);
  }
}

// Export singleton instance
export const systemLogService = new SystemLogService();
