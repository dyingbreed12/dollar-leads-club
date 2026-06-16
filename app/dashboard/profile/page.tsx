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
import { ProfileForm } from '@/components/profile-form';
import { SubscriptionCard } from '@/components/subscription-card';
import { userService } from '@/services/user.service';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Shield, Mail, CheckCircle, XCircle } from 'lucide-react';
import { formatDateLongServer } from '@/lib/server-timezone-display';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const user = await userService.getUserById(session.user.id);

  if (!user) {
    redirect('/login');
  }

  // Format dates using configured timezone from settings
  const createdDate = await formatDateLongServer(user.created_at);
  const trialEndDate = user.trial_end ? await formatDateLongServer(user.trial_end) : null;
  const subscriptionEndDate = user.subscription_current_period_end
    ? await formatDateLongServer(user.subscription_current_period_end)
    : null;

  // Determine subscription plan display name
  const planDisplayName =
    user.subscription_plan === 'dollar-lead'
      ? 'Dollar Lead Club'
      : user.subscription_plan === 'diamond-lead'
        ? 'Diamond Lead Club'
        : 'No Active Plan';

  // Determine subscription status
  const isActive = user.subscription_status === 'active';
  const isTrialing = user.subscription_status === 'trialing';

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
                <BreadcrumbPage>Profile</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">
              Manage your profile information and view your account details
            </p>
          </div>

          {/* Avatar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Your profile avatar and display information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={session.user.image || ''} alt={user.name} />
                  <AvatarFallback className="text-2xl">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{user.name}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Avatar upload feature coming soon
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Info Card */}
          <SubscriptionCard
            user={user}
            planDisplayName={planDisplayName}
            trialEndDate={trialEndDate}
            subscriptionEndDate={subscriptionEndDate}
            isActive={isActive}
            isTrialing={isTrialing}
          />

          {/* Account Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your account details and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="font-medium">Member Since:</span>
                </div>
                <span className="text-sm text-muted-foreground">{createdDate}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-muted-foreground" />
                  <span className="font-medium">Role:</span>
                </div>
                <Badge variant="outline" className="capitalize">
                  {user.role}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="font-medium">Email Verified:</span>
                </div>
                <div className="flex items-center gap-2">
                  {user.email_verified ? (
                    <>
                      <CheckCircle className="size-4 text-green-600" />
                      <span className="text-sm text-green-600">Verified</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="size-4 text-orange-600" />
                      <span className="text-sm text-orange-600">Not Verified</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Form */}
          <ProfileForm user={user} />
        </div>
      </div>
    </>
  );
}
