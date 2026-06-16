import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { userService } from '@/services/user.service';
import { ImpersonationBanner } from '@/components/impersonation-banner';
import { requireUser } from '@/lib/auth-utils';
import { IntercomWidget } from '@/components/intercom-widget';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Check for impersonation first (admins can impersonate users)
  const cookieStore = await cookies();
  const impersonationTarget = cookieStore.get('impersonation_target');
  const impersonationAdmin = cookieStore.get('impersonation_admin');
  const isImpersonatingInitial = !!impersonationTarget;

  // If not impersonating, require user role (redirects admins to /admin/dashboard)
  // If impersonating, allow admin to access user dashboard
  const session = isImpersonatingInitial ? await auth() : await requireUser();

  // Ensure session exists
  if (!session) {
    redirect('/login');
  }

  let targetUser = null;
  let adminUser = null;
  let isImpersonating = false;

  if (impersonationTarget && impersonationAdmin) {
    // Verify both users exist
    targetUser = await userService.getUserById(impersonationTarget.value);
    adminUser = await userService.getUserById(impersonationAdmin.value);

    if (targetUser && adminUser) {
      isImpersonating = true;
    }
  }

  // Use impersonated user data if impersonating, otherwise use session user
  const displayUser = isImpersonating && targetUser ? targetUser : session.user;

  return (
    <>
      {isImpersonating && targetUser && adminUser && (
        <ImpersonationBanner
          targetUser={{ name: targetUser.name, email: targetUser.email }}
          originalAdmin={{ name: adminUser.name, email: adminUser.email }}
        />
      )}
      <div className={isImpersonating ? 'pt-10' : ''}>
        <SidebarProvider>
          <AppSidebar user={displayUser} isImpersonating={isImpersonating} />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </div>
      {/* comment out intercom widget for now */}
      <IntercomWidget />
    </>
  );
}
