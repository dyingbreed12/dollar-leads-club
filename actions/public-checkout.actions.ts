'use server';

import { stripeService } from '@/services/stripe.service';
import { userService } from '@/services/user.service';
import type { SubscriptionActionResult } from '@/types/subscription.types';

/**
 * Create a public Stripe Checkout Session for non-authenticated users
 * Checks if email already exists and blocks if so
 */
export async function createPublicCheckoutSessionAction(
  priceId: string,
  planName: string
): Promise<SubscriptionActionResult> {
  try {
    // Create checkout session for public user
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const checkoutUrl = await stripeService.createPublicCheckoutSession(
      priceId,
      planName,
      `${baseUrl}/complete-registration?session_id={CHECKOUT_SESSION_ID}`,
      `${baseUrl}/pricing?canceled=true`
    );

    return {
      success: true,
      url: checkoutUrl,
    };
  } catch (error) {
    console.error('Error in createPublicCheckoutSessionAction:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Verify checkout session and check if user already exists
 * Used on the complete-registration page to fetch session data
 */
export async function verifyCheckoutSessionAction(
  sessionId: string
): Promise<{
  success: boolean;
  error?: string;
  session?: {
    customerEmail: string;
    customerName: string;
    customerId: string;
    subscriptionId: string;
    planName: string;
    status: string;
  };
}> {
  try {
    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripeService.getCheckoutSession(sessionId);

    if (!checkoutSession) {
      return {
        success: false,
        error: 'Invalid or expired checkout session',
      };
    }

    // Verify checkout was successful
    if (checkoutSession.payment_status !== 'paid') {
      return {
        success: false,
        error: 'Payment was not completed',
      };
    }

    // Extract customer info
    const customer =
      typeof checkoutSession.customer === 'string'
        ? null
        : checkoutSession.customer;
    const subscription =
      typeof checkoutSession.subscription === 'string'
        ? null
        : checkoutSession.subscription;

    // Check if customer exists and is not deleted
    if (!customer || customer.deleted) {
      return {
        success: false,
        error: 'No customer found in checkout session',
      };
    }

    if (!customer.email) {
      return {
        success: false,
        error: 'No customer email found in checkout session',
      };
    }

    // Note: We allow existing users to proceed here
    // The complete-registration action will handle existing users
    // by showing them a login form with upgrade/downgrade message

    // Return session data
    return {
      success: true,
      session: {
        customerEmail: customer.email,
        customerName: customer.name || '',
        customerId: typeof checkoutSession.customer === 'string'
          ? checkoutSession.customer
          : checkoutSession.customer?.id || '',
        subscriptionId: typeof checkoutSession.subscription === 'string'
          ? checkoutSession.subscription
          : checkoutSession.subscription?.id || '',
        planName: (checkoutSession.metadata?.planName as string) || '',
        status: subscription?.status || 'active',
      },
    };
  } catch (error) {
    console.error('Error in verifyCheckoutSessionAction:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
