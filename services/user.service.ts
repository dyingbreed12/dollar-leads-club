import { userRepository } from '@/repositories/user.repository';
import {
  User,
  CreateUserDTO,
  UpdateUserDTO,
  UserResponseDTO,
  UserFilters,
  PaginationOptions,
  PaginatedResponse,
} from '@/types/user.types';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { emailService } from '@/lib/email.service';
import { stripeService } from './stripe.service';
import { firebaseAuthService } from '@/lib/firebase-auth.service';

/**
 * User Service
 *
 * Contains all business logic related to user management.
 * Uses UserRepository for data access operations.
 */
export class UserService {
  /**
   * Register a new user
   */
  async registerUser(data: CreateUserDTO): Promise<UserResponseDTO> {
    // Validate input
    this.validateEmail(data.email);
    this.validatePassword(data.password);

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Create user with hashed password
    const createData: CreateUserDTO & { password_hash?: string; password_raw?: string } = {
      ...data,
      password_hash: passwordHash,
      password_raw: data.password, // Note: Storing raw password is not recommended in production
    };

    const user = await userRepository.create(createData as CreateUserDTO);

    // Generate verification token
    const verificationToken = this.generateToken();
    await userRepository.setVerificationToken(user.id, verificationToken);

    // Create Stripe customer
    try {
      const stripeCustomerId = await stripeService.createCustomer(user.email, user.name);
      await userRepository.updateStripeInfo(user.id, {
        stripe_customer_id: stripeCustomerId,
      });
      user.stripe_customer_id = stripeCustomerId; // Update local user object for response
    } catch (error) {
      console.error('Failed to create Stripe customer during registration:', error);
      // Don't fail registration if Stripe fails - will be created at next login
    }

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.name);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail registration if email fails
    }

    return this.mapToResponseDTO(user);
  }

  /**
   * Authenticate user with email and password
   * Supports hybrid Firebase/Supabase authentication for migrated users
   */
  async authenticateUser(email: string, password: string): Promise<UserResponseDTO> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      console.error(`[AUTH] User not found for email: ${email}`);
      throw new Error('Invalid credentials');
    }

    // Check if user has null password_hash (migrated from Firebase)
    if (!user.password_hash) {
      console.log(`[AUTH] User ${email} has null password_hash, attempting Firebase authentication...`);

      // Try to authenticate with Firebase
      try {
        const isFirebaseValid = await firebaseAuthService.verifyCredentials(email, password);

        if (!isFirebaseValid) {
          console.error(`[AUTH] Firebase authentication failed for ${email} - credentials invalid`);
          throw new Error('Invalid credentials');
        }
      } catch (error) {
        console.error(`[AUTH] Firebase authentication error for ${email}:`, error instanceof Error ? error.message : error);
        throw new Error('Invalid credentials');
      }

      console.log(`[AUTH] Firebase authentication successful for ${email}, migrating password to Supabase...`);

      // Firebase authentication successful, migrate password to Supabase
      try {
        const passwordHash = await this.hashPassword(password);
        const updated = await userRepository.updatePassword(user.id, passwordHash, password);

        if (!updated) {
          console.error('[AUTH] Failed to update password after Firebase authentication');
        } else {
          console.log(`[AUTH] Password successfully migrated to Supabase for ${email}`);
          // Update local user object
          user.password_hash = passwordHash;
          user.password_raw = password;
        }
      } catch (error) {
        console.error('[AUTH] Error migrating password from Firebase to Supabase:', error);
        // Don't fail login if password migration fails - will retry next login
      }
    } else {
      // User has password_hash, use standard bcrypt verification
      console.log(`[AUTH] User ${email} has password_hash, using bcrypt verification...`);
      const isPasswordValid = await this.verifyPassword(password, user.password_hash);

      if (!isPasswordValid) {
        console.error(`[AUTH] Bcrypt password verification failed for ${email}`);
        throw new Error('Invalid credentials');
      }
      console.log(`[AUTH] Bcrypt password verification successful for ${email}`);
    }

    // Update login status
    await userRepository.updateLoginStatus(user.id, true);

    // Create Stripe customer if doesn't exist
    if (!user.stripe_customer_id) {
      try {
        const stripeCustomerId = await stripeService.createCustomer(user.email, user.name);
        await userRepository.updateStripeInfo(user.id, {
        stripe_customer_id: stripeCustomerId,
      });
        user.stripe_customer_id = stripeCustomerId; // Update local user object for response
      } catch (error) {
        console.error('Failed to create Stripe customer during login:', error);
        // Don't fail login if Stripe fails - will retry next login
      }
    }

    return this.mapToResponseDTO(user);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserResponseDTO | null> {
    const user = await userRepository.findById(id);

    if (!user) {
      return null;
    }

    return this.mapToResponseDTO(user);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserResponseDTO | null> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      return null;
    }

    return this.mapToResponseDTO(user);
  }

  /**
   * Get user by Stripe customer ID
   */
  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<UserResponseDTO | null> {
    const user = await userRepository.findByStripeCustomerId(stripeCustomerId);

    if (!user) {
      return null;
    }

    return this.mapToResponseDTO(user);
  }

  /**
   * Get all users with optional filters
   */
  async getUsers(
    filters?: UserFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<UserResponseDTO>> {
    // Get users with pagination
    const users = await userRepository.findAll(filters, pagination);

    // Get total count for pagination
    const total = await userRepository.count(filters);

    // Calculate pagination metadata
    const page = pagination?.page || 1;
    const limit = pagination?.limit || total;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    return {
      data: users.map((user) => this.mapToResponseDTO(user)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update user profile
   */
  async updateUserProfile(id: string, data: UpdateUserDTO): Promise<UserResponseDTO | null> {
    // Validate email if being updated
    if (data.email) {
      this.validateEmail(data.email);

      // Check if email is already taken by another user
      const existingUser = await userRepository.findByEmail(data.email);
      if (existingUser && existingUser.id !== id) {
        throw new Error('Email is already taken');
      }

      // If email is changed, reset email verification
      if (existingUser && existingUser.email !== data.email) {
        data.email_verified = false;
      }
    }

    const updatedUser = await userRepository.update(id, data);

    if (!updatedUser) {
      return null;
    }

    return this.mapToResponseDTO(updatedUser);
  }

  /**
   * Change user password
   */
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await userRepository.findById(id);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password_hash);

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Hash new password
    const newPasswordHash = await this.hashPassword(newPassword);

    // Update password
    return await userRepository.updatePassword(id, newPasswordHash, newPassword);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<string> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new Error('User not found');
    }

    // Generate reset token
    const resetToken = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    await userRepository.setPasswordResetToken(user.id, resetToken, expiresAt);

    // Send password reset email - throw error if it fails
    try {
      await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (error) {
      console.error('[User Service] Failed to send password reset email:', error);

      // Re-throw error with helpful message
      if (error instanceof Error && error.message.includes('not configured')) {
        throw new Error('Email service is not configured. Please contact support to reset your password.');
      }

      throw new Error('Failed to send password reset email. Please try again or contact support.');
    }

    return resetToken;
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const users = await userRepository.findAll();
    const user = users.find(
      (u) =>
        u.password_reset_token === token &&
        u.password_reset_expires &&
        u.password_reset_expires > new Date()
    );

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);

    // Update password and clear reset token
    const updated = await userRepository.updatePassword(user.id, passwordHash, newPassword);

    if (updated) {
      await userRepository.update(user.id, {
        password_reset_token: null,
        password_reset_expires: null,
      });
    }

    return updated;
  }

  /**
   * Verify user email
   */
  async verifyEmail(token: string): Promise<boolean> {
    const users = await userRepository.findAll();
    const user = users.find((u) => u.verification_token === token);

    if (!user) {
      throw new Error('Invalid verification token');
    }

    return await userRepository.verifyEmail(user.id);
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<boolean> {
    return await userRepository.delete(id);
  }

  /**
   * Logout user
   */
  async logoutUser(id: string): Promise<boolean> {
    return await userRepository.updateLoginStatus(id, false);
  }

  /**
   * Update Stripe information
   */
  async updateStripeInfo(
    id: string,
    data: {
      stripe_customer_id?: string;
      stripe_subscription_id?: string;
    }
  ): Promise<boolean> {
    return await userRepository.updateStripeInfo(id, data);
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    id: string,
    data: {
      subscription_plan?: string | null;
      subscription_status?: string | null;
      subscription_current_period_end?: string | null;
    }
  ): Promise<boolean> {
    return await userRepository.updateSubscription(id, data);
  }

  /**
   * ADMIN METHODS - Use service role key, bypass RLS
   * These methods should ONLY be used in webhooks and admin operations
   */

  /**
   * Update Stripe information (Admin - bypasses RLS)
   * Use this in webhooks and admin operations only
   */
  async updateStripeInfoAdmin(
    id: string,
    data: {
      stripe_customer_id?: string;
      stripe_subscription_id?: string;
      stripe_subscription_status?: string;
      stripe_subscription_current_period_end?: string;
      
    }
  ): Promise<boolean> {
    return await userRepository.updateStripeInfoAdmin(id, data);
  }

  /**
   * Update subscription (Admin - bypasses RLS)
   * Use this in webhooks and admin operations only
   */
  async updateSubscriptionAdmin(
    id: string,
    data: {
      subscription_plan?: string | null;
      subscription_status?: string | null;
      subscription_current_period_end?: string | null;
    }
  ): Promise<boolean> {
    return await userRepository.updateSubscriptionAdmin(id, data);
  }

  /**
   * Get user by Stripe customer ID (Admin - bypasses RLS)
   * Use this in webhooks and admin operations only
   */
  async getUserByStripeCustomerIdAdmin(customerId: string): Promise<User | null> {
    return await userRepository.findByStripeCustomerIdAdmin(customerId);
  }

  /**
   * Get user count
   */
  async getUserCount(filters?: UserFilters): Promise<number> {
    return await userRepository.count(filters);
  }

  /**
   * Create user from Stripe checkout (public signup flow)
   * User is auto-verified since they paid
   */
  async createUserFromStripeCheckout(data: {
    email: string;
    name: string;
    password: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
    subscriptionCurrentPeriodEnd: string;
  }): Promise<UserResponseDTO> {
    // Validate input
    this.validateEmail(data.email);
    this.validatePassword(data.password);

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(data.password);

    // Create user with verified email and Stripe info
    const createData: CreateUserDTO & {
      password_hash?: string;
      password_raw?: string;
      email_verified?: boolean;
      stripe_customer_id?: string;
      stripe_subscription_id?: string;
      subscription_plan?: string;
      subscription_status?: string;
      subscription_current_period_end?: string;
      lead_access?: boolean;
    } = {
      name: data.name,
      email: data.email,
      password: data.password,
      password_hash: passwordHash,
      password_raw: data.password,
      email_verified: true, // Auto-verify since they paid
      stripe_customer_id: data.stripeCustomerId,
      stripe_subscription_id: data.stripeSubscriptionId,
      subscription_plan: data.subscriptionPlan as string,
      subscription_status: data.subscriptionStatus as string,
      subscription_current_period_end: data.subscriptionCurrentPeriodEnd,
      lead_access: false, // New users start with no lead access
    };

    const user = await userRepository.create(createData as CreateUserDTO);

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.name);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail registration if email fails
    }

    return this.mapToResponseDTO(user);
  }

  /**
   * Check if user exists
   */
  async userExists(id: string): Promise<boolean> {
    return await userRepository.exists(id);
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    return await userRepository.existsByEmail(email);
  }

  // Private helper methods

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
  }

  /**
   * Generate random token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Map User entity to UserResponseDTO (excludes sensitive data)
   */
  private mapToResponseDTO(user: User): UserResponseDTO {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      email_verified: user.email_verified,
      role: user.role,
      stripe_customer_id: user.stripe_customer_id,
      subscription_plan: user.subscription_plan,
      stripe_subscription_id: user.stripe_subscription_id,
      subscription_status: user.subscription_status,
      subscription_current_period_end: user.subscription_current_period_end,
      trial_end: user.trial_end,
      has_used_trial: user.has_used_trial,
      is_logged_in: user.is_logged_in,
      lead_access: user.lead_access,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}

// Export singleton instance
export const userService = new UserService();
