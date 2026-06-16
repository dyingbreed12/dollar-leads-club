import { requireAdmin } from '@/lib/auth-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { LifeBuoy, Construction } from 'lucide-react';

export default async function AdminSupportPage() {
  await requireAdmin();

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Support</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <Construction className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle className="text-2xl">Coming Soon</CardTitle>
            <CardDescription>
              Support Center is under development
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <LifeBuoy className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Support</span>
            </div>
            <p className="text-sm text-muted-foreground">
              We&apos;re working on building a comprehensive support management system.
              This will include ticket management, user inquiries, FAQ management,
              and support documentation tools.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
