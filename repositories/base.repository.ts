/**
 * Base Repository Interface
 *
 * Defines the contract for all repositories in the application.
 * Provides standard CRUD operations that all repositories should implement.
 *
 * @template T - The entity type
 * @template CreateDTO - The DTO for creating entities
 * @template UpdateDTO - The DTO for updating entities
 * @template Filters - The filters type for querying entities
 */
export interface IBaseRepository<T, CreateDTO, UpdateDTO, Filters> {
  /**
   * Find an entity by its ID
   * @param id - The entity ID
   * @returns The entity if found, null otherwise
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find all entities matching the given filters
   * @param filters - Query filters
   * @returns Array of matching entities
   */
  findAll(filters?: Filters): Promise<T[]>;

  /**
   * Create a new entity
   * @param data - Data for creating the entity
   * @returns The created entity
   */
  create(data: CreateDTO): Promise<T>;

  /**
   * Update an existing entity
   * @param id - The entity ID
   * @param data - Data for updating the entity
   * @returns The updated entity if found, null otherwise
   */
  update(id: string, data: UpdateDTO): Promise<T | null>;

  /**
   * Delete an entity
   * @param id - The entity ID
   * @returns True if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Check if an entity exists
   * @param id - The entity ID
   * @returns True if exists, false otherwise
   */
  exists(id: string): Promise<boolean>;

  /**
   * Count entities matching the given filters
   * @param filters - Query filters
   * @returns The count of matching entities
   */
  count(filters?: Filters): Promise<number>;
}
