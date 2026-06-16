/**
 * Subscription Types
 *
 * Type definitions for subscription-related operations
 */

export type SubscriptionPlan = 'dollar-lead' | 'diamond-lead' | null;

export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid'
  | null;

export interface SubscriptionInfo {
  subscriptionId: string | null;
  customerId: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
}

export type CheckoutType = 'public' | 'authenticated';

export interface CheckoutMetadata {
  checkout_type: CheckoutType;
  user_id?: string;
}

export interface CreateCheckoutSessionParams {
  userId: string;
  priceId: string;
  planName: SubscriptionPlan;
  successUrl: string;
  cancelUrl: string;
  metadata?: CheckoutMetadata;
}

export interface PublicCheckoutSessionParams {
  priceId: string;
  planName: SubscriptionPlan;
  successUrl: string;
  cancelUrl: string;
}

export interface UpdateSubscriptionParams {
  subscriptionId: string;
  newPriceId: string;
  newPlanName: SubscriptionPlan;
  prorationBehavior: 'always_invoice' | 'create_prorations' | 'none';
  billing_cycle_anchor?: string;
  payment_behavior?: string;
}

export interface SubscriptionActionResult {
  success: boolean;
  message?: string;
  error?: string;
  url?: string;
  subscriptionId?: string;
}

export interface WebhookSubscriptionData {
  subscriptionId: string;
  customerId: string;
  status: SubscriptionStatus;
  planName: SubscriptionPlan;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  priceId: string;
}
