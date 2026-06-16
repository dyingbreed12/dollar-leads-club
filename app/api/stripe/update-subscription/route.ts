import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { stripeService } from '@/services/stripe.service';
import { userService } from '@/services/user.service';
import type { SubscriptionPlan } from '@/types/subscription.types';

/**
 * Update Subscription API Route
 * POST /api/stripe/update-subscription
 *
 * Handles subscription upgrades and downgrades:
 * - Upgrades: Immediate change with prorated charge
 * - Downgrades: Scheduled for end of billing period
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

    // Parse request body
    const body = await req.json();
    const { newPriceId, newPlanName, action } = body;

    if (!newPriceId || !newPlanName) {
      return NextResponse.json(
        { error: 'Missing required fields: newPriceId, newPlanName' },
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

    // Check if user has an active subscription
    if (!user.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Determine proration behavior based on action
    let prorationBehavior: 'always_invoice' | 'create_prorations' | 'none';

    if (action === 'upgrade') {
      // Upgrade: Apply proration and charge immediately
      prorationBehavior = 'always_invoice';
    } else if (action === 'downgrade') {
      // Downgrade: Schedule for end of period, no proration
      prorationBehavior = 'none';
    } else {
      // Default: Create prorations but don't invoice immediately
      prorationBehavior = 'create_prorations';
    }

    // Update subscription
    const updatedSubscription = await stripeService.updateSubscription({
      subscriptionId: user.stripe_subscription_id,
      newPriceId,
      newPlanName: newPlanName as SubscriptionPlan,
      prorationBehavior,
    });

    // Get plan values for comparison
    const getPlanValue = (plan: string | null): number => {
      switch (plan) {
        case 'diamond-lead':
          return 497;
        case 'dollar-lead':
          return 97;
        default:
          return 0;
      }
    };

    const isUpgrade = getPlanValue(newPlanName) > getPlanValue(user.subscription_plan);
    const subscriptionData = updatedSubscription as unknown as { current_period_end: number; status: string; id: string };
    const currentPeriodEnd = new Date(subscriptionData.current_period_end * 1000);

    // Update local database (webhook will also update, but this is for immediate feedback)
    await userService.updateSubscription(session.user.id, {
      subscription_plan: newPlanName,
      subscription_status: subscriptionData.status,
      subscription_current_period_end: currentPeriodEnd.toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: isUpgrade
        ? 'Subscription upgraded successfully! You now have access to premium features.'
        : 'Subscription change scheduled. Your new plan will be active at the end of your current billing period.',
      subscriptionId: subscriptionData.id,
      currentPeriodEnd: currentPeriodEnd.toISOString(),
      isUpgrade,
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update subscription',
      },
      { status: 500 }
    );
  }
}
