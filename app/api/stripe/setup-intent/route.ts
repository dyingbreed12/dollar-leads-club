import { createClient } from '@/utils/supabase/server';
import { stripeService } from '@/services/stripe.service';
import { NextResponse } from 'next/server';

/**
 * POST /api/stripe/setup-intent
 *
 * Creates a Stripe SetupIntent for collecting payment method
 * Returns client secret for Stripe Elements
 */
export async function POST() {
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
      .select('stripe_customer_id, name, email')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let customerId = userData.stripe_customer_id;

    // If user doesn't have a Stripe customer, create one
    if (!customerId) {
      customerId = await stripeService.createCustomer(
        userData.email,
        userData.name
      );

      // Update user record with new Stripe customer ID
      const { error: updateError } = await supabase
        .from('users')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);

      if (updateError) {
        console.error('Failed to update user with Stripe customer ID:', updateError);
        // Continue anyway - customer was created in Stripe
      }
    }

    // Create SetupIntent
    const setupIntent = await stripeService.createSetupIntent(customerId);

    return NextResponse.json(
      {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to create setup intent:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create setup intent',
      },
      { status: 500 }
    );
  }
}
