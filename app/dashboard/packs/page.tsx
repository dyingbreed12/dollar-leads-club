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
import { Package, DollarSign, Sparkles } from 'lucide-react';

export default async function PacksPage() {
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
                <BreadcrumbPage>Packs</BreadcrumbPage>
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
                <Package className="size-16 text-green-600" />
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
              Lead Packs
            </h1>

            {/* Description */}
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Purchase additional leads in bulk at discounted rates. Choose from Dollar Packs or Diamond Packs to supercharge your lead generation.
            </p>

            {/* Pack Types */}
            <div className="grid md:grid-cols-2 gap-6 mt-12 max-w-2xl mx-auto">
              {/* Dollar Pack */}
              <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
                <DollarSign className="size-10 text-green-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Dollar Packs</h3>
                <p className="text-sm text-muted-foreground">
                  Buy qualified warm leads in bulk at approximately $0.50 per lead
                </p>
              </div>

              {/* Diamond Pack */}
              <div className="border-2 border-green-500 rounded-lg p-6 bg-gradient-to-br from-green-400 to-green-600">
                <Sparkles className="size-10 text-white mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">Diamond Packs</h3>
                <p className="text-sm text-white/90">
                  Buy hot leads with call recordings in bulk at approximately $5 per lead
                </p>
              </div>
            </div>

            {/* Footer Note */}
            <p className="text-sm text-muted-foreground mt-8">
              This feature will be available soon. Stay tuned for updates!
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
