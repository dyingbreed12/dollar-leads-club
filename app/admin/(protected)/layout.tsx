import { AdminSidebar } from '@/components/admin-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { requireAdmin } from '@/lib/auth-utils';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Require admin role - redirects if not admin
  const session = await requireAdmin();

  return (
    <SidebarProvider>
      <AdminSidebar user={session.user} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
