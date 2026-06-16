'use server';

import { auth } from '@/auth';
import { stripeService } from '@/services/stripe.service';
import { userService } from '@/services/user.service';
import { getSubscriptionPeriodEnd } from '@/lib/stripe-date-utils';
import { formatDateServer } from '@/lib/server-timezone-display';
import type { SubscriptionActionResult } from '@/types/subscription.types';

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSessionAction(
  priceId: string,
  planName: string
): Promise<SubscriptionActionResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to subscribe',
      };
    }

    // Get user details
    const user = await userService.getUserById(session.user.id);
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Ensure user has a Stripe customer ID
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      // Create Stripe customer if doesn't exist
      customerId = await stripeService.createCustomer(user.email, user.name);
      await userService.updateStripeInfo(session.user.id, {
        stripe_customer_id: customerId,
      });
    }

    // Create checkout session
    const checkoutUrl = await stripeService.createCheckoutSession({
      userId: customerId,
      priceId,
      planName: planName as any,
      successUrl: `${process.env.NEXTAUTH_URL}/dashboard/pricing?success=true`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/dashboard/pricing?canceled=true`,
    });

    return {
      success: true,
      url: checkoutUrl,
    };
  } catch (error) {
    console.error('Error in createCheckoutSessionAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Open Stripe Customer Portal for subscription management
 */
export async function openCustomerPortalAction(): Promise<SubscriptionActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to manage your subscription',
      };
    }

    // Get user details
    const user = await userService.getUserById(session.user.id);
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Check if user has a Stripe customer ID
    if (!user.stripe_customer_id) {
      return {
        success: false,
        error: 'No Stripe customer found. Please subscribe to a plan first.',
      };
    }

    // Create customer portal session
    const portalUrl = await stripeService.createPortalSession(
      user.stripe_customer_id,
      `${process.env.NEXTAUTH_URL}/dashboard/pricing`
    );

    return {
      success: true,
      url: portalUrl,
    };
  } catch (error) {
    console.error('Error in openCustomerPortalAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Upgrade subscription to a higher tier
 */
export async function upgradeSubscriptionAction(
  newPriceId: string,
  newPlanName: string
): Promise<SubscriptionActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to upgrade your subscription',
      };
    }

    // Get user details
    const user = await userService.getUserById(session.user.id);
    console.log('user1:', user, session, newPriceId, newPlanName);
    if (!user || !user.stripe_subscription_id) {
      return {
        success: false,
        error: 'No active subscription found',
      };
    }

    // Update subscription with immediate proration
    const updatedSubscription = await stripeService.updateSubscription({
      subscriptionId: user.stripe_subscription_id,
      newPriceId,
      newPlanName: newPlanName as any,
      prorationBehavior: 'always_invoice',
    });

    // Get period end with fallback to calculated value
    const currentPeriodEnd = getSubscriptionPeriodEnd(updatedSubscription);
    if (!currentPeriodEnd) {
      console.error('[Upgrade] Unable to determine subscription period end');
      return {
        success: false,
        error: 'Failed to determine subscription period end. Please contact support.',
      };
    }

    // Update local database
    await userService.updateSubscription(session.user.id, {
      subscription_plan: newPlanName,
      subscription_status: updatedSubscription.status,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
    });

    return {
      success: true,
      message: 'Subscription upgraded successfully! You now have access to premium features.',
      subscriptionId: updatedSubscription.id,
    };
  } catch (error) {
    console.error('Error in upgradeSubscriptionAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Downgrade subscription to a lower tier
 */
export async function downgradeSubscriptionAction(
  newPriceId: string,
  newPlanName: string
): Promise<SubscriptionActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to downgrade your subscription',
      };
    }

    

    // Get user details
    const user = await userService.getUserById(session.user.id);

    console.log('user1:', user, session, newPriceId, newPlanName);
    if (!user || !user.stripe_subscription_id) {
      return {
        success: false,
        error: 'No active subscription found',
      };
    }

    // Update subscription - schedule change for period end
    const updatedSubscription = await stripeService.updateSubscription({
      subscriptionId: user.stripe_subscription_id,
      newPriceId,
      newPlanName: newPlanName as any,
      prorationBehavior: 'none',
      billing_cycle_anchor: 'unchanged',
      payment_behavior: 'error_if_incomplete',
    });

    // Get period end with fallback to calculated value
    const currentPeriodEnd = getSubscriptionPeriodEnd(updatedSubscription);
    if (!currentPeriodEnd) {
      console.error('[Downgrade] Unable to determine subscription period end');
      return {
        success: false,
        error: 'Failed to determine subscription period end. Please contact support.',
      };
    }

    // Update local database
    await userService.updateSubscription(session.user.id, {
      subscription_plan: newPlanName,
      subscription_status: updatedSubscription.status,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
    });

    return {
      success: true,
      message: 'Subscription change scheduled. Your new plan will be active at the end of your current billing period.',
      subscriptionId: updatedSubscription.id,
    };
  } catch (error) {
    console.error('Error in downgradeSubscriptionAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Cancel subscription at the end of the billing period
 */
export async function cancelSubscriptionAction(): Promise<SubscriptionActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to cancel your subscription',
      };
    }

    // Get user details
    const user = await userService.getUserById(session.user.id);
    if (!user || !user.stripe_subscription_id) {
      return {
        success: false,
        error: 'No active subscription found',
      };
    }

    // Cancel the subscription
    const canceledSubscription = await stripeService.cancelSubscription(
      user.stripe_subscription_id
    );

    // Get period end with fallback to calculated value
    const accessUntil = getSubscriptionPeriodEnd(canceledSubscription);
    if (!accessUntil) {
      console.error('[Cancel] Unable to determine subscription period end');
      return {
        success: true,
        message: 'Your subscription has been canceled and will end at the end of your current billing period.',
      };
    }

    // Format date using configured timezone
    const formattedDate = await formatDateServer(accessUntil);

    return {
      success: true,
      message: `Your subscription will be canceled at the end of your billing period (${formattedDate}). You'll continue to have access until then.`,
    };
  } catch (error) {
    console.error('Error in cancelSubscriptionAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Resume a canceled subscription
 */
export async function resumeSubscriptionAction(): Promise<SubscriptionActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to resume your subscription',
      };
    }

    // Get user details
    const user = await userService.getUserById(session.user.id);
    if (!user || !user.stripe_subscription_id) {
      return {
        success: false,
        error: 'No subscription found',
      };
    }

    // Resume the subscription
    await stripeService.resumeSubscription(user.stripe_subscription_id);

    return {
      success: true,
      message: 'Your subscription has been reactivated successfully!',
    };
  } catch (error) {
    console.error('Error in resumeSubscriptionAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Get customer's default payment method
 */
export async function getPaymentMethodAction(): Promise<{
  success: boolean;
  paymentMethod?: {
    id: string;
    type: string;
    card?: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
      funding?: string;
    };
  } | null;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to view payment methods',
      };
    }

    // Get user details
    const user = await userService.getUserById(session.user.id);
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Check if user has a Stripe customer ID
    if (!user.stripe_customer_id) {
      return {
        success: true,
        paymentMethod: null,
      };
    }

    // Fetch payment method from Stripe
    const paymentMethod = await stripeService.getCustomerDefaultPaymentMethod(
      user.stripe_customer_id
    );

    // Return formatted payment method
    if (!paymentMethod) {
      return {
        success: true,
        paymentMethod: null,
      };
    }

    return {
      success: true,
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card
          ? {
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              exp_month: paymentMethod.card.exp_month,
              exp_year: paymentMethod.card.exp_year,
              funding: paymentMethod.card.funding,
            }
          : undefined,
      },
    };
  } catch (error) {
    console.error('Error in getPaymentMethodAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Create a SetupIntent for collecting payment method
 */
export async function createSetupIntentAction(): Promise<{
  success: boolean;
  clientSecret?: string;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to update payment methods',
      };
    }

    // Get user details
    const user = await userService.getUserById(session.user.id);
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    let customerId = user.stripe_customer_id;

    // If user doesn't have a Stripe customer, create one
    if (!customerId) {
      customerId = await stripeService.createCustomer(user.email, user.name);

      // Update user record with new Stripe customer ID
      await userService.updateStripeInfo(session.user.id, {
        stripe_customer_id: customerId,
      });
    }

    // Create SetupIntent
    const setupIntent = await stripeService.createSetupIntent(customerId);

    return {
      success: true,
      clientSecret: setupIntent.client_secret || undefined,
    };
  } catch (error) {
    console.error('Error in createSetupIntentAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Update customer's default payment method
 */
export async function updatePaymentMethodAction(
  paymentMethodId: string
): Promise<SubscriptionActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'You must be logged in to update payment methods',
      };
    }

    if (!paymentMethodId) {
      return {
        success: false,
        error: 'Payment method ID is required',
      };
    }

    // Get user details
    const user = await userService.getUserById(session.user.id);
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    if (!user.stripe_customer_id) {
      return {
        success: false,
        error: 'No Stripe customer found',
      };
    }

    // Attach payment method to customer
    await stripeService.attachPaymentMethod(
      paymentMethodId,
      user.stripe_customer_id
    );

    // Set as default payment method
    await stripeService.setDefaultPaymentMethod(
      user.stripe_customer_id,
      paymentMethodId
    );

    // If user has an active subscription, update subscription's payment method
    if (user.stripe_subscription_id) {
      await stripeService.updateSubscriptionPaymentMethod(
        user.stripe_subscription_id,
        paymentMethodId
      );
    }

    return {
      success: true,
      message: 'Payment method updated successfully!',
    };
  } catch (error) {
    console.error('Error in updatePaymentMethodAction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
