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
import { LifeBuoy, MessageCircle, Mail, Phone } from 'lucide-react';

export default async function SupportPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

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
                <BreadcrumbPage>Support</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="max-w-4xl mx-auto w-full py-12">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="rounded-full bg-green-50 p-6">
                <LifeBuoy className="size-16 text-green-600" />
              </div>
            </div>

            {/* Coming Soon Badge */}
            <div className="inline-block">
              <span className="px-6 py-2 bg-green-600 text-white rounded-full text-sm font-semibold">
                COMING SOON
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-gray-900">
              Support Center
            </h1>

            {/* Description */}
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get help with your account, leads, subscriptions, and more. Our dedicated support team is here to ensure your success.
            </p>


            {/* Interim Contact Section */}
            <div className="mt-12 max-w-2xl mx-auto">
              <div className="border-2 border-green-600 rounded-lg p-8 bg-green-50">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Need Help Now?
                </h2>
                <p className="text-muted-foreground mb-4">
                  While we're building our comprehensive support center, you can reach our team directly via email.
                  We typically respond within 24 hours during business days.
                </p>
                <div className="flex items-center justify-center gap-2 text-lg">
                  <Mail className="size-5 text-green-600" />
                  <a
                    href="mailto:support@dollarleads.com"
                    className="text-green-600 font-semibold hover:text-green-700 hover:underline transition-colors"
                  >
                    support@dollarleads.com
                  </a>
                </div>
              </div>
            </div>

           
          </div>
        </div>
      </div>
    </>
  );
}
