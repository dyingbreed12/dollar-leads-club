import { userRepository } from '@/repositories/user.repository';
import { UpdateUserDTO } from '@/types/user.types';

/**
 * Admin Service
 * Handles administrative operations and privileged actions
 */
export class AdminService {
  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
    await userRepository.update(userId, { role });
  }

  /**
   * Verify user email manually (admin override)
   */
  async verifyUserEmail(userId: string): Promise<void> {
    await userRepository.update(userId, {
      email_verified: true,
      verification_token: null,
    });
  }

  /**
   * Grant lead access to user
   */
  async grantLeadAccess(userId: string): Promise<void> {
    await userRepository.update(userId, { lead_access: true });
  }

  /**
   * Revoke lead access from user
   */
  async revokeLeadAccess(userId: string): Promise<void> {
    await userRepository.update(userId, { lead_access: false });
  }

  /**
   * Force logout user
   */
  async forceLogoutUser(userId: string): Promise<void> {
    await userRepository.update(userId, { is_logged_in: false });
  }

  /**
   * Update user subscription details (admin override)
   */
  async updateUserSubscription(
    userId: string,
    subscriptionData: {
      subscription_plan?: string | null;
      subscription_status?: string | null;
      subscription_current_period_end?: Date | null;
    }
  ): Promise<void> {
    await userRepository.update(userId, subscriptionData);
  }

  /**
   * Extend or set trial period for user
   */
  async extendTrial(userId: string, days: number): Promise<void> {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + days);

    await userRepository.update(userId, {
      trial_end: trialEnd,
      has_used_trial: false,
    });
  }

  /**
   * Reset trial status for user
   */
  async resetTrial(userId: string): Promise<void> {
    await userRepository.update(userId, {
      has_used_trial: false,
      trial_end: null,
    });
  }

  /**
   * Delete user account permanently
   */
  async deleteUser(userId: string): Promise<void> {
    await userRepository.delete(userId);
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats() {
    const totalUsers = await userRepository.count();
    const adminUsers = await userRepository.count({ role: 'admin' });
    const regularUsers = await userRepository.count({ role: 'user' });
    const verifiedUsers = await userRepository.count({ email_verified: true });
    const activeUsers = await userRepository.count({ is_logged_in: true });
    const activeSubscriptions = await userRepository.count({
      subscription_status: 'active',
    });
    const usersWithLeadAccess = await userRepository.count({ lead_access: true });

    return {
      totalUsers,
      adminUsers,
      regularUsers,
      verifiedUsers,
      activeUsers,
      activeSubscriptions,
      usersWithLeadAccess,
      verificationRate:
        totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
      subscriptionRate:
        totalUsers > 0 ? Math.round((activeSubscriptions / totalUsers) * 100) : 0,
      activeUserRate:
        totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
    };
  }

  /**
   * Get user growth statistics
   */
  async getUserGrowthStats() {
    const allUsers = await userRepository.findAll({}, { limit: 10000, page: 1 });
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const usersLast7Days = allUsers.filter(
      (user) => new Date(user.created_at) >= last7Days
    ).length;
    const usersLast30Days = allUsers.filter(
      (user) => new Date(user.created_at) >= last30Days
    ).length;
    const usersLast90Days = allUsers.filter(
      (user) => new Date(user.created_at) >= last90Days
    ).length;

    return {
      last7Days: usersLast7Days,
      last30Days: usersLast30Days,
      last90Days: usersLast90Days,
      averagePerDay: Math.round(usersLast30Days / 30),
    };
  }

  /**
   * Bulk update users
   */
  async bulkUpdateUsers(
    userIds: string[],
    updateData: Partial<UpdateUserDTO>
  ): Promise<number> {
    let updated = 0;
    for (const userId of userIds) {
      try {
        await userRepository.update(userId, updateData);
        updated++;
      } catch (error) {
        console.error(`Failed to update user ${userId}:`, error);
      }
    }
    return updated;
  }

  /**
   * Delete unverified users older than specified days
   */
  async deleteUnverifiedUsers(olderThanDays: number = 30): Promise<number> {
    const users = await userRepository.findAll({ email_verified: false });
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let deleted = 0;
    for (const user of users) {
      if (new Date(user.created_at) < cutoffDate) {
        try {
          await userRepository.delete(user.id);
          deleted++;
        } catch (error) {
          console.error(`Failed to delete user ${user.id}:`, error);
        }
      }
    }

    return deleted;
  }

  /**
   * Get subscription analytics
   */
  async getSubscriptionAnalytics() {
    const totalUsers = await userRepository.count();
    const activeSubscriptions = await userRepository.count({
      subscription_status: 'active',
    });
    const canceledSubscriptions = await userRepository.count({
      subscription_status: 'canceled',
    });
    const pastDueSubscriptions = await userRepository.count({
      subscription_status: 'past_due',
    });

    return {
      total: totalUsers,
      active: activeSubscriptions,
      canceled: canceledSubscriptions,
      pastDue: pastDueSubscriptions,
      conversionRate:
        totalUsers > 0 ? Math.round((activeSubscriptions / totalUsers) * 100) : 0,
      churnRate:
        activeSubscriptions + canceledSubscriptions > 0
          ? Math.round(
              (canceledSubscriptions / (activeSubscriptions + canceledSubscriptions)) * 100
            )
          : 0,
    };
  }

  /**
   * Search users by query
   */
  async searchUsers(query: string) {
    // This is a simple implementation
    // In production, you might want to use full-text search
    const allUsers = await userRepository.findAll({}, { limit: 100, page: 1 });

    const lowerQuery = query.toLowerCase();
    return allUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery)
    );
  }
}

export const adminService = new AdminService();
