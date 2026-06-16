import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripeService } from '@/services/stripe.service';
import { userService } from '@/services/user.service';
import type { SubscriptionPlan } from '@/types/subscription.types';

/**
 * Create Stripe Checkout Session API Route
 * POST /api/stripe/create-checkout-session
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    console.log('session2', session);

    if (!session?.user?.id) {
      console.error('Session check failed:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

 

    // Parse request body
    const body = await req.json();
    const { priceId, planName } = body;

    if (!priceId || !planName) {
      return NextResponse.json(
        { error: 'Missing required fields: priceId, planName' },
        { status: 400 }
      );
    }

    // Get user details
    const user = await userService.getUserById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
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
      userId: customerId, // Pass customerId as userId parameter
      priceId,
      planName: planName as SubscriptionPlan,
      successUrl: `${process.env.NEXTAUTH_URL}/dashboard/pricing?success=true`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/dashboard/pricing?canceled=true`,
    });


    return NextResponse.json({
      success: true,
      url: checkoutUrl,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}
