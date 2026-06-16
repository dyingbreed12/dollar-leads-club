import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripeService } from '@/services/stripe.service';
import { userService } from '@/services/user.service';
import { emailService } from '@/lib/email.service';
import { googleSheetsService } from '@/lib/google-sheets.service';
import { getSubscriptionPeriodEnd } from '@/lib/stripe-date-utils';
import type { SubscriptionPlan } from '@/types/subscription.types';
import type { UserResponseDTO } from '@/types/user.types';

/**
 * Stripe Webhook Handler
 * Processes Stripe webhook events for subscription lifecycle management
 */

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripeService.constructWebhookEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout session
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const checkoutType = session.metadata?.checkout_type || 'authenticated';

  console.log('[Webhook] Processing checkout.session.completed for customer:', customerId);
  console.log('[Webhook] Checkout type:', checkoutType);

  if (!customerId || !subscriptionId) {
    console.error('[Webhook] Missing required data in checkout session:', { customerId, subscriptionId });
    return;
  }

  // For public checkouts, skip webhook processing - user will be created in complete-registration page
  if (checkoutType === 'public') {
    console.log('[Webhook] Skipping public checkout - user will be created after password setup');
    return;
  }

  try {
    // Find user by customer ID (using admin client to bypass RLS)
    const user = await userService.getUserByStripeCustomerIdAdmin(customerId);
    if (!user) {
      console.error('[Webhook] User not found for customer:', customerId);
      return;
    }

    console.log('[Webhook] Found user:', user.id);

    // Retrieve subscription details
    const subscription = await stripeService.getSubscription(subscriptionId);
    if (!subscription) {
      console.error('[Webhook] Subscription not found:', subscriptionId);
      return;
    }

    // Set payment method as customer's default if subscription has one
    if (subscription.default_payment_method) {
      try {
        const paymentMethodId = typeof subscription.default_payment_method === 'string'
          ? subscription.default_payment_method
          : subscription.default_payment_method.id;

        console.log('[Webhook] Setting default payment method for customer:', customerId, paymentMethodId);
        await stripeService.setDefaultPaymentMethod(customerId, paymentMethodId);
        console.log('[Webhook] Successfully set default payment method');
      } catch (error) {
        console.error('[Webhook] Failed to set default payment method:', error);
        // Don't throw - this is not critical enough to fail the entire webhook
      }
    }

    const planName = determinePlanName(subscription);
    console.log('[Webhook] Determined plan name:', planName);

    // Get period end with fallback to calculated value
    const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
    if (!currentPeriodEnd) {
      console.error('[Webhook] Unable to determine subscription period end');
      return;
    }

    // Update user subscription in database (using admin client to bypass RLS)
    console.log('[Webhook] Updating subscription for user:', user.id, {
      subscription_plan: planName,
      subscription_status: subscription.status,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
    });
    await userService.updateSubscriptionAdmin(user.id, {
      subscription_plan: planName,
      subscription_status: subscription.status,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
    });
    console.log('[Webhook] Successfully updated subscription for user: handleCheckoutSessionCompleted:', user.id, {
      subscription_plan: planName,
      subscription_status: subscription.status,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
    });

    console.log('[Webhook] Updating Stripe info for user:', user.id, {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    });
    await userService.updateStripeInfoAdmin(user.id, {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    });
    console.log('[Webhook] Successfully updated Stripe info for user:', user.id);

    // Send confirmation email
    if (user.email) {
      console.log('[Webhook] Sending subscription confirmation email to:', user.email);
      await emailService.sendSubscriptionConfirmation(
        user.email,
        user.name,
        planName || 'Unknown',
        currentPeriodEnd
      );
    }

    // Update Google Sheets Dashboard
    try {
      console.log('[Webhook] Updating Google Sheets dashboard for:', user.name);
      await googleSheetsService.updateDashboardStats(
        planName || '',
        user.name,
        user.email
      );
    } catch (sheetsError) {
      console.error('[Webhook] ⚠️ Failed to update Google Sheets:', sheetsError);
      // Continue - don't fail the webhook
    }

    console.log('[Webhook] Successfully completed checkout.session.completed for user:', user.id);
  } catch (error) {
    console.error('[Webhook] Error in handleCheckoutSessionCompleted:', error);
    throw error;
  }
}

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;

  console.log('[Webhook] Processing customer.subscription.created for customer:', customerId);

  try {
    // Find user by customer ID (using admin client to bypass RLS)
    const user = await userService.getUserByStripeCustomerIdAdmin(customerId);
    if (!user) {
      console.error('[Webhook] User not found for customer:', customerId);
      return;
    }

    console.log('[Webhook] Found user:', user.id);

    const planName = determinePlanName(subscription);
    console.log('[Webhook] Determined plan name:', planName);

    // Get period end with fallback to calculated value
    const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
    if (!currentPeriodEnd) {
      console.error('[Webhook] Unable to determine subscription period end');
      return;
    }

    console.log('[Webhook] Updating subscription for user:', user.id, {
      subscription_plan: planName,
      subscription_status: subscription.status,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
    });
    await userService.updateSubscriptionAdmin(user.id, {
      subscription_plan: planName,
      subscription_status: subscription.status,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
    });
    console.log('[Webhook] Successfully updated subscription for user: handleSubscriptionCreated: ', user.id, {
      subscription_plan: planName,
      subscription_status: subscription.status,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
    });

    console.log('[Webhook] Updating Stripe info for user:', user.id, {
      stripe_subscription_id: subscriptionId,
    });
    await userService.updateStripeInfoAdmin(user.id, {
      stripe_subscription_id: subscriptionId,
    });
    console.log('[Webhook] Successfully updated Stripe info for user:', user.id);

    console.log('[Webhook] Successfully completed customer.subscription.created for user:', user.id);
  } catch (error) {
    console.error('[Webhook] Error in handleSubscriptionCreated:', error);
    throw error;
  }
}

/**
 * Handle subscription updates (upgrades/downgrades)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  console.log('[Webhook] Processing customer.subscription.updated for customer:', customerId);

  try {
    // Find user by customer ID (using admin client to bypass RLS)
    const user = await userService.getUserByStripeCustomerIdAdmin(customerId);
    if (!user) {
      console.error('[Webhook] User not found for customer:', customerId);
      return;
    }

    console.log('[Webhook] Found user:', user.id);

    const planName = determinePlanName(subscription);
    console.log('[Webhook] Determined plan name:', planName);

    // Get period end with fallback to calculated value
    const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
    if (!currentPeriodEnd) {
      console.error('[Webhook] Unable to determine subscription period end');
      return;
    }

    // When Trialing Override to Active, This is to Extend the subscription that the user didnt receive any Leads.
    if(subscription.status === "trialing"){
      subscription.status = "active";
      console.log('[Webhook] Subscription trialling has been updated to status:', subscription.status);
    }

    // Check if this subscription is being canceled
    if (subscription.status === 'canceled' || subscription.status === 'incomplete_expired') {
      console.log('[Webhook] Subscription is canceled/expired, updating status only (not changing plan)');
      console.log('[Webhook] Subscription status:', subscription.status);

      // Only update status to canceled, don't change the plan
      // (User may have already upgraded to a new subscription)
      await userService.updateSubscriptionAdmin(user.id, {
        subscription_status: subscription.status,
        subscription_current_period_end: currentPeriodEnd.toISOString(),
      });

      console.log('[Webhook] Successfully updated status to canceled for user:', user.id);
      return;
    }

    // Check if this is the user's current active subscription
    // This prevents overwriting when user has upgraded to a newer subscription
    if (user.stripe_subscription_id && user.stripe_subscription_id !== subscription.id) {
      console.log('[Webhook] Subscription ID mismatch - user has a different active subscription');
      console.log('[Webhook] Event subscription ID:', subscription.id);
      console.log('[Webhook] User\'s current subscription ID:', user.stripe_subscription_id);
      console.log('[Webhook] Skipping plan update to prevent overwriting newer subscription');
      return;
    }

    // Update subscription in database (using admin client to bypass RLS)
    console.log('[Webhook] Updating subscription for user:', user.id, {
      subscription_plan: planName,
      subscription_status: subscription.status,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
    });
    await userService.updateSubscriptionAdmin(user.id, {
      subscription_plan: planName,
      subscription_status: subscription.status,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
    });
    console.log('[Webhook] Successfully updated subscription for user: handleSubscriptionUpdated: ', user.id, {
      subscription_plan: planName,
      subscription_status: subscription.status,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
    });

    // Send appropriate email based on subscription change
    if (subscription.cancel_at_period_end) {
      // Subscription was canceled
      console.log('[Webhook] Sending subscription canceled email to:', user.email);
      await emailService.sendSubscriptionCanceled(
        user.email,
        user.name,
        planName || 'Unknown',
        currentPeriodEnd
      );
    } else if (user.subscription_plan && user.subscription_plan !== planName) {
      // Plan was changed (upgraded or downgraded)
      const isUpgrade = getPlanValue(planName) > getPlanValue(user.subscription_plan);

      if (isUpgrade) {
        console.log('[Webhook] Sending subscription upgraded email to:', user.email);
        await emailService.sendSubscriptionUpgraded(
          user.email,
          user.name,
          user.subscription_plan,
          planName || 'Unknown',
          currentPeriodEnd
        );
      } else {
        console.log('[Webhook] Sending subscription downgraded email to:', user.email);
        await emailService.sendSubscriptionDowngraded(
          user.email,
          user.name,
          user.subscription_plan,
          planName || 'Unknown',
          currentPeriodEnd
        );
      }
    }

    console.log('[Webhook] Successfully completed customer.subscription.updated for user:', user.id);
  } catch (error) {
    console.error('[Webhook] Error in handleSubscriptionUpdated:', error);
    throw error;
  }
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  console.log('[Webhook] Processing customer.subscription.deleted for customer:', customerId);

  try {
    // Find user by customer ID (using admin client to bypass RLS)
    const user = await userService.getUserByStripeCustomerIdAdmin(customerId);
    if (!user) {
      console.error('[Webhook] User not found for customer:', customerId);
      return;
    }

    console.log('[Webhook] Found user:', user.id);

    const planName = user.subscription_plan || 'Unknown';

    // Update subscription status to canceled (using admin client to bypass RLS)
    console.log('[Webhook] Updating subscription to canceled for user:', user.id);
    await userService.updateSubscriptionAdmin(user.id, {
      subscription_plan: null,
      subscription_status: 'canceled',
      subscription_current_period_end: null,
    });
    console.log('[Webhook] Successfully updated subscription to canceled for user:', user.id);

    console.log('[Webhook] Sending subscription ended email to:', user.email);
    await emailService.sendSubscriptionEnded(user.email, user.name, planName);

    console.log('[Webhook] Successfully completed customer.subscription.deleted for user:', user.id);
  } catch (error) {
    console.error('[Webhook] Error in handleSubscriptionDeleted:', error);
    throw error;
  }
}

/**
 * Handle successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  console.log('[Webhook] Processing invoice.payment_succeeded for customer:', customerId);

  // Check if this is a subscription-related invoice using billing_reason
  const isSubscriptionInvoice = invoice.billing_reason && [
    'subscription_create',
    'subscription_cycle',
    'subscription_threshold',
    'subscription_update'
  ].includes(invoice.billing_reason);

  if (!isSubscriptionInvoice) {
    console.log('[Webhook] Not a subscription invoice, billing_reason:', invoice.billing_reason);
    return; // Not a subscription invoice
  }

  // Extract subscription ID from invoice lines (most reliable for all API versions)
  let subscriptionId: string | undefined;

  if (invoice.lines?.data?.[0]?.subscription) {
    subscriptionId = typeof invoice.lines.data[0].subscription === 'string'
      ? invoice.lines.data[0].subscription
      : invoice.lines.data[0].subscription?.id;
  }

  // Fallback: Try parent.subscription_details (new Stripe API since June 2023)
  if (!subscriptionId && invoice.parent?.subscription_details?.subscription) {
    subscriptionId = typeof invoice.parent.subscription_details.subscription === 'string'
      ? invoice.parent.subscription_details.subscription
      : invoice.parent.subscription_details.subscription.id;
  }

  if (!subscriptionId) {
    console.error('[Webhook] Could not extract subscription ID from invoice:', invoice.id);
    console.error('[Webhook] Invoice billing_reason:', invoice.billing_reason);
    console.error('[Webhook] Invoice lines:', invoice.lines?.data?.length || 0, 'items');
    return;
  }

  console.log('[Webhook] Extracted subscription ID:', subscriptionId);

  try {
    // Retrieve subscription to get details
    const subscription = await stripeService.getSubscription(subscriptionId);
    if (!subscription) {
      console.error('[Webhook] Subscription not found:', subscriptionId);
      return;
    }

    const planName = determinePlanName(subscription);
    console.log('[Webhook] Determined plan name:', planName);

    // Get period end with fallback to calculated value
    const currentPeriodEnd = getSubscriptionPeriodEnd(subscription);
    if (!currentPeriodEnd) {
      console.error('[Webhook] Unable to determine subscription period end');
      return;
    }

    // First, try to find user by Stripe customer ID
    // Type as UserResponseDTO since webhook only needs public fields (id, email, subscription info)
    let user: UserResponseDTO | null = await userService.getUserByStripeCustomerIdAdmin(customerId);

    // If user not found by customer ID, check if this is a public checkout
    // by getting customer email and checking if user exists with that email
    if (!user) {
      console.log('[Webhook] User not found by customer ID, checking by email for public checkout');

      // Get customer details from Stripe
      const customer = await stripeService.getCustomer(customerId);
      if (!customer || customer.deleted) {
        console.error('[Webhook] Customer not found or deleted:', customerId);
        return;
      }

      const customerEmail = customer.email;
      if (!customerEmail) {
        console.error('[Webhook] No email found for customer:', customerId);
        return;
      }

      console.log('[Webhook] Checking if user exists with email:', customerEmail);
      user = await userService.getUserByEmail(customerEmail);

      if (user) {
        console.log('[Webhook] Found existing user by email:', user.id);
        console.log('[Webhook] This is a public checkout for existing user - updating subscription');

      // This is an existing user subscribing via public checkout
        // Cancel old subscription if they had one and it's different
        if (user.stripe_subscription_id && user.stripe_subscription_id !== subscriptionId) {
          console.log('[Webhook] User has different subscription, canceling old one:', user.stripe_subscription_id);
          try {
            await stripeService.cancelSubscription(user.stripe_subscription_id);
            console.log('[Webhook] Successfully canceled old subscription');
          } catch (cancelError) {
            console.error('[Webhook] Failed to cancel old subscription:', cancelError);
            // Continue anyway - the new subscription should take precedence
          }
        }

        // Update user with new subscription details
        console.log('[Webhook] Updating subscription for existing user:', user.id, {
          subscription_plan: planName,
          subscription_status: subscription.status,
          stripe_subscription_id: subscriptionId,
          subscription_current_period_end: currentPeriodEnd.toISOString(),
        });
        await userService.updateSubscriptionAdmin(user.id, {
          subscription_plan: planName,
          subscription_status: subscription.status,
          subscription_current_period_end: currentPeriodEnd.toISOString(),
        });

        // Update Stripe IDs
        console.log('[Webhook] Updating Stripe IDs for user:', user.id);
        await userService.updateStripeInfoAdmin(user.id, {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        });

        console.log('[Webhook] Successfully updated existing user subscription via public checkout');
      } else {
        // User doesn't exist yet - they will be created when they complete registration
        console.log('[Webhook] User not found by email - will be created during registration');
        return;
      }
    } else {
      console.log('[Webhook] Found user by customer ID:', user.id);

      // Regular recurring payment - update subscription details
      console.log('[Webhook] Updating subscription for user:', user.id, {
        subscription_status: subscription.status,
        subscription_current_period_end: currentPeriodEnd.toISOString(),
      });
      await userService.updateSubscriptionAdmin(user.id, {
        subscription_status: subscription.status,
        subscription_current_period_end: currentPeriodEnd.toISOString(),
      });
    }

    console.log('[Webhook] Successfully updated subscription for user: handleInvoicePaymentSucceeded:', user.id, {
      subscription_status: subscription.status,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
    });

    // Send payment success email
    console.log('[Webhook] Sending payment succeeded email to:', user.email);
    await emailService.sendPaymentSucceeded(
      user.email,
      user.name,
      planName || 'Unknown',
      invoice.amount_paid / 100, // Convert from cents
      currentPeriodEnd
    );

    console.log('[Webhook] Successfully completed invoice.payment_succeeded for user:', user.id);
  } catch (error) {
    console.error('[Webhook] Error in handleInvoicePaymentSucceeded:', error);
    throw error;
  }
}

/**
 * Handle failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  console.log('[Webhook] Processing invoice.payment_failed for customer:', customerId);

  try {
    // Find user by customer ID (using admin client to bypass RLS)
    const user = await userService.getUserByStripeCustomerIdAdmin(customerId);
    if (!user) {
      console.error('[Webhook] User not found for customer:', customerId);
      return;
    }

    console.log('[Webhook] Found user:', user.id);

    const planName = user.subscription_plan || 'Unknown';
    const attemptCount = invoice.attempt_count || 1;

    // Check if subscription period has ended
    const now = new Date();
    const periodEnd = user.subscription_current_period_end
      ? new Date(user.subscription_current_period_end)
      : null;

    const hasExpired = periodEnd && periodEnd < now;

    // Only update to past_due if subscription period has ended
    if (hasExpired) {
      console.log('[Webhook] Updating subscription status to past_due for user:', user.id);
      await userService.updateSubscriptionAdmin(user.id, {
        subscription_status: 'past_due',
      });
      console.log('[Webhook] Successfully updated subscription status to past_due for user:', user.id);
    } else {
      console.log('[Webhook] Skipping status update - subscription period has not ended yet for user:', user.id);
      console.log('[Webhook] Period end:', periodEnd, 'Now:', now);
    }

    // Send payment failed email regardless of status update
    console.log('[Webhook] Sending payment failed email to:', user.email);
    await emailService.sendPaymentFailed(
      user.email,
      user.name,
      planName,
      invoice.amount_due / 100, // Convert from cents
      attemptCount
    );

    console.log('[Webhook] Successfully completed invoice.payment_failed for user:', user.id);
  } catch (error) {
    console.error('[Webhook] Error in handleInvoicePaymentFailed:', error);
    throw error;
  }
}

/**
 * Determines the subscription plan type from a Stripe subscription.
 *
 * @param subscription - The Stripe subscription object to evaluate
 * @returns The identified plan name, or null if no matching plan is found
 *
 * @remarks
 * This function handles multiple pricing eras due to historical changes:
 *
 * 1. **Current pricing** - Uses environment variables for price IDs, allowing
 *    different prices per environment (dev/staging/prod)
 *
 * 2. **Legacy pricing ($499/$497 era)** - Hardcoded price IDs for subscribers
 *    who signed up under old pricing. These customers retain their original
 *    price IDs even though the pricing structure has changed.
 *
 * 3. **Metadata fallback** - For edge cases where price ID matching fails,
 *    we check subscription metadata (see {@link getPlanFromMetadata})
 *
 * If you're adding a new plan or price tier, you'll need to:
 * - Add new environment variables for the price IDs
 * - Add a new conditional block following the existing pattern
 * - Update the SubscriptionPlan type if it's a new plan type
 */
function determinePlanName(subscription: Stripe.Subscription): SubscriptionPlan {
  // Extract the primary price ID from the subscription's first line item.
  // We assume single-item subscriptions; multi-item would need different handling.
  const priceId = subscription.items.data[0]?.price.id;

  // Current price IDs from environment variables.
  // Dual fallback (server-side → client-side) supports both Next.js contexts.
  const dollarPlanPriceId =
    process.env.STRIPE_DOLLAR_LEAD_PLAN || process.env.NEXT_PUBLIC_STRIPE_DOLLAR_LEAD_PLAN;
  const diamondPlanPriceId =
    process.env.STRIPE_DIAMOND_LEAD_PLAN || process.env.NEXT_PUBLIC_STRIPE_DIAMOND_LEAD_PLAN;

  // Legacy price IDs - DO NOT REMOVE
  // These are from the $497/$99 pricing.
  // Existing subscribers still have these price IDs on their subscriptions.
  // Removing these would break plan identification for legacy customers.
  const LEGACY_DOLLAR_LEAD_PRICE_ID = 'price_1SSRGGFkBbjOABBx6DVobsVa';
  const LEGACY_DIAMOND_LEAD_PRICE_ID = 'price_1SSRGOFkBbjOABBx0qEM15bE';

  // --- Plan matching (order doesn't matter, IDs are mutually exclusive) ---

  if (priceId === dollarPlanPriceId || priceId === LEGACY_DOLLAR_LEAD_PRICE_ID) {
    return 'dollar-lead';
  }

  if (priceId === diamondPlanPriceId || priceId === LEGACY_DIAMOND_LEAD_PRICE_ID) {
    return 'diamond-lead';
  }

  // No price ID match found - fall back to subscription metadata.
  // This catches subscriptions created through non-standard flows or
  // manual Stripe dashboard creation where metadata was set directly.
  return getPlanFromMetadata(subscription.metadata);
}

/**
 * Extracts the plan name from subscription metadata.
 * Checks planName first, then falls back to legacy userClass field.
 *
 * @param metadata - The subscription's metadata object
 * @returns The identified plan name, or null if not determinable
 */
function getPlanFromMetadata(
  metadata: Stripe.Metadata | null | undefined
): SubscriptionPlan | null {
  if (!metadata) {
    return null;
  }

  // Primary field used in current subscriptions
  if (metadata.planName) {
    return metadata.planName as SubscriptionPlan;
  }

  // Legacy field from older subscriptions (values: "Diamond" or "Dollar")
  if (metadata.userClass) {
    const userClassLower = metadata.userClass.toLowerCase();

    if (userClassLower === 'diamond') {
      return 'diamond-lead' as SubscriptionPlan;
    }

    if (userClassLower === 'dollar') {
      return 'dollar-lead' as SubscriptionPlan;
    }
  }

  return null;
}

/**
 * Get numeric value for plan comparison
 */
function getPlanValue(plan: string | null): number {
  switch (plan) {
    case 'diamond-lead':
      return 497;
    case 'dollar-lead':
      return 97;
    default:
      return 0;
  }
}
