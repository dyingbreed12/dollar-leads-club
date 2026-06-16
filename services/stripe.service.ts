import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import type {
  CreateCheckoutSessionParams,
  UpdateSubscriptionParams,
} from '@/types/subscription.types';

/**
 * Stripe Service
 * Handles all Stripe-related operations including customer management,
 * subscriptions, and payment processing.
 */
export class StripeService {
  /**
   * Create a new Stripe customer
   * @param email - Customer email address
   * @param name - Customer name
   * @returns Stripe customer ID
   * @throws Error if customer creation fails
   */
  async createCustomer(email: string, name: string): Promise<string> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          source: 'dollar-deal-club',
        },
      });

      return customer.id;
    } catch (error) {
      console.error('Failed to create Stripe customer:', error);
      throw new Error(
        `Failed to create Stripe customer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve a Stripe customer by ID
   * @param customerId - Stripe customer ID
   * @returns Stripe customer object or null if not found
   */
  async getCustomer(customerId: string) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      return customer.deleted ? null : customer;
    } catch (error) {
      console.error('Failed to retrieve Stripe customer:', error);
      return null;
    }
  }

  /**
   * Update a Stripe customer's information
   * @param customerId - Stripe customer ID
   * @param data - Data to update
   * @returns Updated customer ID
   */
  async updateCustomer(
    customerId: string,
    data: { email?: string; name?: string }
  ): Promise<string> {
    try {
      const customer = await stripe.customers.update(customerId, data);
      return customer.id;
    } catch (error) {
      console.error('Failed to update Stripe customer:', error);
      throw new Error(
        `Failed to update Stripe customer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a Stripe Checkout Session for subscription
   * @param params - Checkout session parameters
   * @returns Checkout session URL
   */
  async createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<string> {
    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: params.userId, // This should be customerId, will be passed from action
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: params.priceId,
            quantity: 1,
          },
        ],
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        metadata: {
          userId: params.userId,
          planName: params.planName || '',
          checkout_type: params.metadata?.checkout_type || 'authenticated',
        },
      };

      const session = await stripe.checkout.sessions.create(sessionParams);

      if (!session.url) {
        throw new Error('No checkout URL returned from Stripe');
      }

      return session.url;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw new Error(
        `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a public checkout session (for non-authenticated users)
   * @param priceId - Stripe price ID
   * @param planName - Subscription plan name
   * @param successUrl - URL to redirect after successful checkout
   * @param cancelUrl - URL to redirect after canceled checkout
   * @returns Checkout session URL
   */
  async createPublicCheckoutSession(
    priceId: string,
    planName: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<string> {
    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        customer_email: undefined, // Let Stripe collect email
        metadata: {
          checkout_type: 'public',
          planName: planName || '',
        },
      };

      const session = await stripe.checkout.sessions.create(sessionParams);

      if (!session.url) {
        throw new Error('No checkout URL returned from Stripe');
      }

      return session.url;
    } catch (error) {
      console.error('Failed to create public checkout session:', error);
      throw new Error(
        `Failed to create public checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve a checkout session by ID
   * @param sessionId - Stripe checkout session ID
   * @returns Checkout session object or null
   */
  async getCheckoutSession(
    sessionId: string
  ): Promise<Stripe.Checkout.Session | null> {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: [
          'customer',
          'subscription',
          'subscription.items.data.price',
        ],
      });
      return session;
    } catch (error) {
      console.error('Failed to retrieve checkout session:', error);
      return null;
    }
  }

  /**
   * Search for a customer by email
   * @param email - Customer email address
   * @returns Customer object or null if not found
   */
  async getCustomerByEmail(email: string): Promise<Stripe.Customer | null> {
    try {
      const customers = await stripe.customers.list({
        email,
        limit: 1,
      });

      return customers.data.length > 0 ? customers.data[0] : null;
    } catch (error) {
      console.error('Failed to search customer by email:', error);
      return null;
    }
  }

  /**
   * Create a Stripe Customer Portal Session
   * @param customerId - Stripe customer ID
   * @param returnUrl - URL to return to after portal session
   * @returns Portal session URL
   */
  async createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<string> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return session.url;
    } catch (error) {
      console.error('Failed to create portal session:', error);
      throw new Error(
        `Failed to create portal session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve a subscription by ID
   * @param subscriptionId - Stripe subscription ID
   * @returns Subscription object or null
   */
  async getSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription | null> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Failed to retrieve subscription:', error);
      return null;
    }
  }

  /**
   * Update a subscription (upgrade/downgrade)
   * @param params - Update subscription parameters
   * @returns Updated subscription
   */
  async updateSubscription(
    params: UpdateSubscriptionParams
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        params.subscriptionId
      );

      const options: Stripe.SubscriptionUpdateParams =  {
        items: [
          {
            id: subscription.items.data[0].id,
            price: params.newPriceId,
          },
        ],
        proration_behavior: params.prorationBehavior,
        metadata: {
          planName: params.newPlanName || '',
        },
      }

      if (params.billing_cycle_anchor) {
        options.billing_cycle_anchor = params.billing_cycle_anchor as Stripe.SubscriptionUpdateParams['billing_cycle_anchor'];
      }

      if (params.payment_behavior) {
        options.payment_behavior = params.payment_behavior as Stripe.SubscriptionUpdateParams['payment_behavior'];
      }

      const updatedSubscription = await stripe.subscriptions.update(
        params.subscriptionId,
        options
      );

      return updatedSubscription;
    } catch (error) {
      console.error('Failed to update subscription:', error);
      throw new Error(
        `Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Cancel a subscription at the end of the billing period
   * @param subscriptionId - Stripe subscription ID
   * @returns Updated subscription
   */
  async cancelSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      return subscription;
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw new Error(
        `Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Resume a canceled subscription
   * @param subscriptionId - Stripe subscription ID
   * @returns Updated subscription
   */
  async resumeSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      return subscription;
    } catch (error) {
      console.error('Failed to resume subscription:', error);
      throw new Error(
        `Failed to resume subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Construct a Stripe webhook event
   * @param payload - Raw request body
   * @param signature - Stripe signature header
   * @param webhookSecret - Webhook secret
   * @returns Stripe event
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): Stripe.Event {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
      return event;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new Error(
        `Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // =====================================================
  // PAYMENT METHOD OPERATIONS
  // =====================================================

  /**
   * Retrieve a payment method by ID
   * @param paymentMethodId - Stripe payment method ID
   * @returns Payment method object
   */
  async getPaymentMethod(
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod | null> {
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        paymentMethodId
      );
      return paymentMethod;
    } catch (error) {
      console.error('Failed to retrieve payment method:', error);
      return null;
    }
  }

  /**
   * Create a SetupIntent for collecting payment method
   * @param customerId - Stripe customer ID
   * @returns SetupIntent with client secret
   */
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session', // Allow charging without customer present
        metadata: {
          purpose: 'update_payment_method',
        },
      });

      return setupIntent;
    } catch (error) {
      console.error('Failed to create setup intent:', error);
      throw new Error(
        `Failed to create setup intent: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Attach a payment method to a customer
   * @param paymentMethodId - Payment method ID
   * @param customerId - Stripe customer ID
   * @returns Attached payment method
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string
  ): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await stripe.paymentMethods.attach(
        paymentMethodId,
        {
          customer: customerId,
        }
      );

      return paymentMethod;
    } catch (error) {
      console.error('Failed to attach payment method:', error);
      throw new Error(
        `Failed to attach payment method: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Set a payment method as the default for a customer
   * @param customerId - Stripe customer ID
   * @param paymentMethodId - Payment method ID
   * @returns Updated customer
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      return customer as Stripe.Customer;
    } catch (error) {
      console.error('Failed to set default payment method:', error);
      throw new Error(
        `Failed to set default payment method: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update subscription payment method
   * @param subscriptionId - Stripe subscription ID
   * @param paymentMethodId - Payment method ID
   * @returns Updated subscription
   */
  async updateSubscriptionPaymentMethod(
    subscriptionId: string,
    paymentMethodId: string
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        default_payment_method: paymentMethodId,
      });

      return subscription;
    } catch (error) {
      console.error('Failed to update subscription payment method:', error);
      throw new Error(
        `Failed to update subscription payment method: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Detach a payment method from a customer
   * @param paymentMethodId - Payment method ID
   * @returns Detached payment method
   */
  async detachPaymentMethod(
    paymentMethodId: string
  ): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await stripe.paymentMethods.detach(
        paymentMethodId
      );

      return paymentMethod;
    } catch (error) {
      console.error('Failed to detach payment method:', error);
      throw new Error(
        `Failed to detach payment method: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get customer's default payment method
   * @param customerId - Stripe customer ID
   * @returns Default payment method or null
   */
  async getCustomerDefaultPaymentMethod(
    customerId: string
  ): Promise<Stripe.PaymentMethod | null> {
    try {
      // First, try to get payment method from customer's invoice settings
      const customer = await stripe.customers.retrieve(customerId, {
        expand: ['invoice_settings.default_payment_method'],
      });

      if (customer.deleted) {
        return null;
      }

      let defaultPaymentMethod = (customer as Stripe.Customer)
        .invoice_settings?.default_payment_method;

      // If customer doesn't have a default payment method set,
      // try to get it from their active subscription
      if (
        typeof defaultPaymentMethod === 'string' ||
        !defaultPaymentMethod
      ) {
        // Fetch customer's active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1,
          expand: ['data.default_payment_method'],
        });

        // If the customer has an active subscription with a payment method, use that
        if (subscriptions.data.length > 0) {
          defaultPaymentMethod = subscriptions.data[0].default_payment_method;
        }
      }

      // Return null if still no payment method found or if it's just a string ID
      if (
        typeof defaultPaymentMethod === 'string' ||
        !defaultPaymentMethod
      ) {
        return null;
      }

      return defaultPaymentMethod as Stripe.PaymentMethod;
    } catch (error) {
      console.error('Failed to get customer default payment method:', error);
      return null;
    }
  }
}

// Export singleton instance
export const stripeService = new StripeService();
