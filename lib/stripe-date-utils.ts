import type Stripe from 'stripe';

/**
 * Shared utility functions for handling Stripe subscription dates
 * Used by both webhook handlers and subscription actions
 */

// Type helper for Stripe Subscription with additional properties
type SubscriptionWithDates = Stripe.Subscription & {
  current_period_end?: number;
  billing_cycle_anchor?: number;
  start_date?: number;
};

/**
 * Calculate subscription period end from billing cycle anchor and plan interval
 * Used as fallback when current_period_end is not provided by Stripe
 *
 * @param subscription - Stripe subscription object
 * @returns Date object representing the period end, or null if cannot be calculated
 */
export function calculatePeriodEnd(subscription: Stripe.Subscription): Date | null {
  try {
    // Use billing_cycle_anchor or start_date as the base
    const sub = subscription as SubscriptionWithDates;
    const baseTimestamp = sub.billing_cycle_anchor || sub.start_date;

    if (!baseTimestamp) {
      console.error('[Stripe Date Utils] No billing_cycle_anchor or start_date found in subscription');
      return null;
    }

    // Get plan interval information
    const interval = subscription.items.data[0]?.price?.recurring?.interval;
    const intervalCount = subscription.items.data[0]?.price?.recurring?.interval_count || 1;

    if (!interval) {
      console.error('[Stripe Date Utils] No interval found in subscription plan');
      return null;
    }

    // Convert base timestamp to Date
    const baseDate = new Date(baseTimestamp * 1000);

    // Calculate period end based on interval
    const periodEnd = new Date(baseDate);

    switch (interval) {
      case 'day':
        periodEnd.setDate(periodEnd.getDate() + intervalCount);
        break;
      case 'week':
        periodEnd.setDate(periodEnd.getDate() + (intervalCount * 7));
        break;
      case 'month':
        periodEnd.setMonth(periodEnd.getMonth() + intervalCount);
        break;
      case 'year':
        periodEnd.setFullYear(periodEnd.getFullYear() + intervalCount);
        break;
      default:
        console.error('[Stripe Date Utils] Unknown interval type:', interval);
        return null;
    }

    console.warn('[Stripe Date Utils] Calculated period end from billing_cycle_anchor:', {
      billing_cycle_anchor: baseTimestamp,
      interval,
      intervalCount,
      calculated_period_end: periodEnd.toISOString()
    });

    return periodEnd;
  } catch (error) {
    console.error('[Stripe Date Utils] Error calculating period end:', error);
    return null;
  }
}

/**
 * Get subscription period end with fallback to calculated value
 * Tries to use current_period_end from Stripe first, then calculates if missing/invalid
 *
 * @param subscription - Stripe subscription object
 * @returns Date object representing the period end, or null if cannot be determined
 */
export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  // Try to use current_period_end from Stripe first
  const sub = subscription as SubscriptionWithDates;
  if (sub.current_period_end) {
    const periodEnd = new Date(sub.current_period_end * 1000);

    // Validate the Date object is valid
    if (!isNaN(periodEnd.getTime())) {
      return periodEnd;
    }

    console.warn('[Stripe Date Utils] Invalid current_period_end timestamp:', sub.current_period_end);
  }

  // Fallback to calculating from billing cycle anchor
  console.warn('[Stripe Date Utils] current_period_end not found or invalid, calculating from billing_cycle_anchor');
  return calculatePeriodEnd(subscription);
}

/**
 * Convert a Date to ISO string safely, returning null if invalid
 *
 * @param date - Date object to convert
 * @returns ISO string or null if date is invalid
 */
export function toISOStringOrNull(date: Date | null): string | null {
  if (!date) {
    return null;
  }

  try {
    if (isNaN(date.getTime())) {
      console.error('[Stripe Date Utils] Attempted to convert invalid Date to ISO string');
      return null;
    }
    return date.toISOString();
  } catch (error) {
    console.error('[Stripe Date Utils] Error converting date to ISO string:', error);
    return null;
  }
}
