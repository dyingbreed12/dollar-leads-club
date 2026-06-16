import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { userService } from '@/services/user.service';
import { stripeService } from '@/services/stripe.service';
import { BillingClient } from './billing-client';

/**
 * Billing Page (Server Component)
 *
 * Displays subscription management and payment method settings
 * Fetches user subscription data and payment method from Stripe
 */
export default async function BillingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Get user subscription data
  const user = await userService.getUserById(session.user.id);

  if (!user) {
    redirect('/login');
  }

  // Fetch subscription details from Stripe if user has a subscription
  let cancelAtPeriodEnd = false;
  if (user.stripe_subscription_id) {
    try {
      const stripeSubscription = await stripeService.getSubscription(
        user.stripe_subscription_id
      );
      if (stripeSubscription) {
        cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
      }
    } catch (error) {
      console.error('Failed to fetch Stripe subscription:', error);
    }
  }

  const subscription = user.subscription_plan
    ? {
        plan: user.subscription_plan,
        status: user.subscription_status || 'inactive',
        currentPeriodEnd: user.subscription_current_period_end?.toISOString() || null,
        cancelAtPeriodEnd,
      }
    : null;

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Billing</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Billing & Subscription</h1>
            <p className="text-muted-foreground">
              Manage your subscription, payment methods, and billing information
            </p>
          </div>
          <BillingClient subscription={subscription} />
        </div>
      </div>
    </>
  );
}
