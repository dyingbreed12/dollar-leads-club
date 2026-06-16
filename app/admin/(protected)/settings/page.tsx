import { requireAdmin } from '@/lib/auth-utils';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Clock, Mail, Shield, Construction } from 'lucide-react';
import { settingsService } from '@/services/settings.service';
import { AutoClaimForm } from './components/auto-claim-form';
import { ReconcileClaimsCard } from './components/reconcile-claims-card';
import { AutoClaimConfig } from '@/types/settings.types';

export default async function AdminSettingsPage() {
  await requireAdmin();

  // Fetch auto-claim configuration
  let autoClaimConfig: AutoClaimConfig | null = null;
  let lastUpdated = new Date().toISOString();
  let configError: string | null = null;

  try {
    const config = await settingsService.getAutoClaimConfig();
    if (config) {
      autoClaimConfig = config.config;
      lastUpdated = config.updated_at;
    } else {
      configError = 'Auto-claim configuration not found. Please run database migrations.';
    }
  } catch (error) {
    console.error('Error fetching auto-claim config:', error);
    configError = 'Failed to load auto-claim configuration.';
  }

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
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">System Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Configure system-wide settings for the Dollar Deal Club platform.
        </p>

        <Tabs defaultValue="auto-claim" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="auto-claim" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Auto-Claim</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2" disabled>
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2" disabled>
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2" disabled>
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="auto-claim" className="mt-6">
            {configError ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Configuration Error</CardTitle>
                  <CardDescription>{configError}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Please ensure the database migrations have been applied. Run:
                  </p>
                  <code className="block mt-2 p-2 bg-muted rounded text-sm">
                    supabase db push
                  </code>
                </CardContent>
              </Card>
            ) : autoClaimConfig ? (
              <div className="space-y-6">
                <AutoClaimForm initialConfig={autoClaimConfig} lastUpdated={lastUpdated} />
                <ReconcileClaimsCard />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Loading...</CardTitle>
                </CardHeader>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="email" className="mt-6">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                  <Construction className="h-8 w-8 text-yellow-600" />
                </div>
                <CardTitle>Email Settings</CardTitle>
                <CardDescription>Coming Soon</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Email configuration options including SMTP settings, templates, and notification
                  preferences will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                  <Construction className="h-8 w-8 text-yellow-600" />
                </div>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Coming Soon</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  Security configuration including password policies, session management, and
                  two-factor authentication settings will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
                  <Construction className="h-8 w-8 text-yellow-600" />
                </div>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Coming Soon</CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                  General platform settings including site name, timezone, and other global
                  configurations will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
