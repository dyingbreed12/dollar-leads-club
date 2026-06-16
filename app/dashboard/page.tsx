import { auth } from '@/auth';
import { requireUser } from '@/lib/auth-utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { userService } from '@/services/user.service';
import { getLeadsStartInfo } from '@/utils/customs/leadsStartDate';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  // Require user role (layout already checks, but this adds defense in depth)
  const session = await requireUser();

  // Get user's subscription plan, lead access, and email
  let userSubscriptionPlan: string | null = null;
  let leadAccess = false;
  let userRole: string | null = null;
  const userEmail = session?.user?.email || null;

  if (session?.user?.id) {
    try {
      const user = await userService.getUserById(session.user.id);
      userSubscriptionPlan = user?.subscription_plan || null;
      userRole = user?.role || null;
      leadAccess = user?.lead_access || false;
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }

  // Get countdown information
  const countdownInfo = getLeadsStartInfo(userEmail, userSubscriptionPlan);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <DashboardClient
          userSubscriptionPlan={userSubscriptionPlan}
          leadAccess={leadAccess}
          countdownInfo={countdownInfo}
          userRole = {userRole}
        />
      </div>
    </>
  );
}
