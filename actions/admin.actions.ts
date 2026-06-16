'use server';

import { userService } from '@/services/user.service';
import { stripeService } from '@/services/stripe.service';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export async function updateUserAction(userId: string, formData: FormData): Promise<ActionResult> {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;

    if (!name || !email) {
      return { success: false, error: 'Name and email are required' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Get current user data
    const currentUser = await userService.getUserById(userId);
    if (!currentUser) {
      return { success: false, error: 'User not found' };
    }

    // Check if email is being changed and if new email already exists
    if (email !== currentUser.email) {
      const existingUser = await userService.getUserByEmail(email);
      if (existingUser) {
        return { success: false, error: 'A user with this email already exists' };
      }
    }

    // Update the user
    await userService.updateUserProfile(userId, {
      name,
      email,
    });

    revalidatePath('/admin/users');

    return { success: true, message: 'User updated successfully' };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    };
  }
}

export async function toggleLeadAccessAction(
  userId: string,
  enabled: boolean
): Promise<ActionResult> {
  try {
    // Get current user data
    const user = await userService.getUserById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Update lead_access
    await userService.updateUserProfile(userId, {
      lead_access: enabled,
    });

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${userId}`);

    return {
      success: true,
      message: `Lead access ${enabled ? 'enabled' : 'disabled'} successfully`,
    };
  } catch (error) {
    console.error('Error toggling lead access:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle lead access',
    };
  }
}

/**
 * Admin action to upgrade or downgrade a user's subscription
 * Performs immediate changes with proration
 */
export async function adminUpdateSubscriptionAction(
  userId: string,
  newPlan: 'dollar-lead' | 'diamond-lead',
  priceId: string
): Promise<ActionResult> {
  try {
    // Verify admin authentication
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify admin role
    const adminUser = await userService.getUserById(session.user.id);
    if (!adminUser || adminUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized - admin access required' };
    }

    // Get target user data
    const user = await userService.getUserById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.stripe_subscription_id) {
      return { success: false, error: 'User has no active subscription' };
    }

    // Update subscription in Stripe (immediate with proration)
    await stripeService.updateSubscription({
      subscriptionId: user.stripe_subscription_id,
      newPriceId: priceId,
      newPlanName: newPlan,
      prorationBehavior: 'create_prorations', // Immediate proration
    });

    // Update user's subscription plan in database
    await userService.updateUserProfile(userId, {
      subscription_plan: newPlan,
    });

    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${userId}`);

    const planName = newPlan === 'diamond-lead' ? 'Diamond Lead Club' : 'Dollar Lead Club';
    return {
      success: true,
      message: `User's subscription updated to ${planName}`,
    };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update subscription',
    };
  }
}
