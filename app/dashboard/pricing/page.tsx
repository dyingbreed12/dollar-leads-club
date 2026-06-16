import { Suspense } from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
import { PricingClient } from './pricing-client';

export default async function PricingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Get user subscription data
  const user = await userService.getUserById(session.user.id);

  const userSubscription = {
    plan: user?.subscription_plan || null,
    status: user?.subscription_status || null,
    currentPeriodEnd: user?.subscription_current_period_end?.toISOString() || null,
    stripeCustomerId: user?.stripe_customer_id || null,
  };

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
                <BreadcrumbPage>Pricing</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          }
        >
          <PricingClient userSubscription={userSubscription} />
        </Suspense>
      </div>
    </>
  );
}
