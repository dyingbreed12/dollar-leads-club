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
import { Send, Star, MessageSquare, Lightbulb } from 'lucide-react';

export default async function FeedbackPage() {
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
                <BreadcrumbPage>Feedback</BreadcrumbPage>
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
                <Send className="size-16 text-green-600" />
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
              Share Your Feedback
            </h1>

            {/* Description */}
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Help us improve Dollar Lead Club by sharing your thoughts, suggestions, and experiences. Your feedback shapes our future.
            </p>

            {/* Feedback Types */}
            <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-3xl mx-auto">
              {/* Feature Requests */}
              <div className="border rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
                <Lightbulb className="size-10 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Feature Requests</h3>
                <p className="text-sm text-muted-foreground">
                  Suggest new features and improvements
                </p>
              </div>

              {/* Bug Reports */}
              <div className="border rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
                <MessageSquare className="size-10 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Bug Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Report issues or unexpected behavior
                </p>
              </div>

              {/* Rate Experience */}
              <div className="border rounded-lg p-6 bg-white hover:shadow-md transition-shadow">
                <Star className="size-10 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Rate Experience</h3>
                <p className="text-sm text-muted-foreground">
                  Share your overall experience with us
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
