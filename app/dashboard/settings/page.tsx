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
import { ChangePasswordForm } from '@/components/change-password-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, AlertTriangle, Trash2, Clock } from 'lucide-react';

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Get current timestamp for session info
  const currentTime = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

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
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div className="max-w-4xl mx-auto w-full space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Account Settings</h1>
            <p className="text-muted-foreground">
              Manage your account security, sessions, and preferences
            </p>
          </div>

          {/* Security Section - Password Change */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Security</h2>
            <ChangePasswordForm userId={session.user.id} />
          </div>

          {/* Session Management Section */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Active Sessions</h2>
            <Card>
              <CardHeader>
                <CardTitle>Session Management</CardTitle>
                <CardDescription>View and manage your active login sessions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Session */}
                <div className="flex items-start justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-start gap-3">
                    <Monitor className="size-5 text-green-600 mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Current Device</span>
                        <Badge variant="default" className="bg-green-600">
                          This Device
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="size-3" />
                        <span>Last active: {currentTime}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Browser: {typeof navigator !== 'undefined' ? 'Web Browser' : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info Message */}
                <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    Session management features are coming soon. You&apos;ll be able to view all active sessions and logout from other devices.
                  </p>
                </div>

                {/* Future: Logout Other Sessions Button (disabled) */}
                <Button variant="outline" disabled className="w-full sm:w-auto">
                  Logout Other Sessions (Coming Soon)
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Danger Zone Section */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-red-600">Danger Zone</h2>
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-5 text-red-600" />
                  <CardTitle className="text-red-600">Delete Account</CardTitle>
                </div>
                <CardDescription>
                  Permanently delete your account and all associated data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                    Warning: This action cannot be undone
                  </h4>
                  <ul className="text-sm text-red-800 dark:text-red-200 space-y-1 list-disc list-inside">
                    <li>All your personal information will be permanently deleted</li>
                    <li>Your subscription will be cancelled immediately</li>
                    <li>You will lose access to all leads and data</li>
                    <li>This action is irreversible and cannot be recovered</li>
                  </ul>
                </div>

                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <Trash2 className="size-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">
                      To delete your account, please contact our support team
                    </p>
                    <p className="text-xs text-muted-foreground">
                      For security reasons, account deletion requires verification through our support team. This helps prevent accidental or unauthorized deletions.
                    </p>
                  </div>
                </div>

                <Button variant="destructive" disabled className="w-full sm:w-auto">
                  <Trash2 className="size-4 mr-2" />
                  Delete Account (Contact Support)
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
