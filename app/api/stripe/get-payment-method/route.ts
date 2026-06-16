import { createClient } from '@/utils/supabase/server';
import { stripeService } from '@/services/stripe.service';
import { NextResponse } from 'next/server';

/**
 * GET /api/stripe/get-payment-method
 *
 * Fetches the customer's default payment method from Stripe
 * Returns card brand, last 4 digits, expiry information
 */
export async function GET() {
  try {
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

    // Get user's Stripe customer ID from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a Stripe customer ID
    if (!userData.stripe_customer_id) {
      return NextResponse.json(
        { paymentMethod: null },
        { status: 200 }
      );
    }

    // Fetch payment method from Stripe
    const paymentMethod = await stripeService.getCustomerDefaultPaymentMethod(
      userData.stripe_customer_id
    );

    // Return payment method details
    if (!paymentMethod) {
      return NextResponse.json(
        { paymentMethod: null },
        { status: 200 }
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
      { paymentMethod: formattedPaymentMethod },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch payment method:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch payment method',
      },
      { status: 500 }
    );
  }
}
