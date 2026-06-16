import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripeService } from '@/services/stripe.service';
import { userService } from '@/services/user.service';

/**
 * Create Stripe Customer Portal Session API Route
 * POST /api/stripe/create-portal-session
 *
 * Allows users to manage their subscription, payment methods, and billing history
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();

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

    // Get user details
    const user = await userService.getUserById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a Stripe customer ID
    if (!user.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please subscribe to a plan first.' },
        { status: 400 }
      );
    }

    // Create customer portal session
    const portalUrl = await stripeService.createPortalSession(
      user.stripe_customer_id,
      `${process.env.NEXTAUTH_URL}/dashboard/pricing`
    );

    return NextResponse.json({
      success: true,
      url: portalUrl,
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create portal session',
      },
      { status: 500 }
    );
  }
}
