'use server';

import { signIn } from '@/auth';
import { userService } from '@/services/user.service';
import { stripeService } from '@/services/stripe.service';
import { getSubscriptionPeriodEnd } from '@/lib/stripe-date-utils';

/**
 * Complete registration after successful Stripe checkout
 * Creates user account, links Stripe subscription, and auto-logs in
 */
export async function completeRegistrationAction(
  sessionId: string,
  customerId: string,
  subscriptionId: string,
  planName: string,
  status: string,
  email: string,
  name: string,
  password: string,
  confirmPassword: string
): Promise<{
  success: boolean;
  error?: string;
  message?: string;
  isExistingUser?: boolean;
}> {
  try {
    // Validate email
    if (!email || !email.trim()) {
      return {
        success: false,
        error: 'Email is required',
      };
    }

    // Validate name
    if (!name || !name.trim()) {
      return {
        success: false,
        error: 'Name is required',
      };
    }

    // Validate passwords
    if (!password || !confirmPassword) {
      return {
        success: false,
        error: 'Password and confirm password are required',
      };
    }

    if (password !== confirmPassword) {
      return {
        success: false,
        error: 'Passwords do not match',
      };
    }

    // Fetch subscription to get period end date
    const subscription = await stripeService.getSubscription(subscriptionId);

    if (!subscription) {
      return {
        success: false,
        error: 'Unable to retrieve subscription details from Stripe',
      };
    }

    // Get period end using helper function (handles fallback automatically)
    const periodEnd = getSubscriptionPeriodEnd(subscription);
    if (!periodEnd) {
      return {
        success: false,
        error: 'Unable to determine subscription period end',
      };
    }

    const subscriptionCurrentPeriodEnd = periodEnd.toISOString();

    // Check if user already exists with the provided email
    const existingUser = await userService.getUserByEmail(email.trim());
    if (existingUser) {
      // Existing user detected - webhook already updated their subscription
      console.log('[Complete Registration] Found existing user:', existingUser.id);
      console.log('[Complete Registration] Subscription should be updated by webhook');

      // Determine the plan display name
      const newPlanDisplay = planName === 'diamond-lead'
        ? 'Diamond Lead Club (DLC+)'
        : 'Dollar Lead Club (DLC)';

      const message = `Your email already exists. Please log in. Your subscription to ${newPlanDisplay} has been processed!`;

      return {
        success: true,
        isExistingUser: true,
        message,
      };
    }

    // Create user with Stripe subscription info
    const user = await userService.createUserFromStripeCheckout({
      email: email.trim(),
      name: name.trim(),
      password,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionPlan: planName,
      subscriptionStatus: status,
      subscriptionCurrentPeriodEnd: subscriptionCurrentPeriodEnd,
    });

    // Auto-login the user
    try {
      await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });
    } catch (error) {
      console.error('Error auto-logging in user:', error);
      // Don't fail registration if auto-login fails
      // User can manually log in
      return {
        success: true,
        message:
          'Account created successfully! Please log in to access your dashboard.',
      };
    }

    return {
      success: true,
      message: 'Account created successfully! Redirecting to dashboard...',
    };
  } catch (error) {
    console.error('Error in completeRegistrationAction:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
