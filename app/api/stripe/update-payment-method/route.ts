import { createClient } from '@/utils/supabase/server';
import { stripeService } from '@/services/stripe.service';
import { NextResponse } from 'next/server';

/**
 * POST /api/stripe/update-payment-method
 *
 * Updates the customer's default payment method
 * Request body: { paymentMethodId: string }
 */
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { paymentMethodId } = body;

    if (!paymentMethodId || typeof paymentMethodId !== 'string') {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's Stripe customer ID and subscription ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!userData.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 400 }
      );
    }

    // Attach payment method to customer (if not already attached)
    await stripeService.attachPaymentMethod(
      paymentMethodId,
      userData.stripe_customer_id
    );

    // Set as default payment method for customer
    await stripeService.setDefaultPaymentMethod(
      userData.stripe_customer_id,
      paymentMethodId
    );

    // If user has an active subscription, update subscription's payment method
    if (userData.stripe_subscription_id) {
      await stripeService.updateSubscriptionPaymentMethod(
        userData.stripe_subscription_id,
        paymentMethodId
      );
    }

    // Fetch the updated payment method details
    const paymentMethod = await stripeService.getPaymentMethod(paymentMethodId);

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Failed to retrieve updated payment method' },
        { status: 500 }
      );
    }

    // Format payment method for client
    const formattedPaymentMethod = {
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
      billing_details: paymentMethod.billing_details,
    };

    return NextResponse.json(
      {
        success: true,
        paymentMethod: formattedPaymentMethod,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to update payment method:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update payment method',
      },
      { status: 500 }
    );
  }
}
