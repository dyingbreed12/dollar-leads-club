import { requireAdmin } from '@/lib/auth-utils';
import { userService } from '@/services/user.service';
import { createClient } from '@/utils/supabase/server';
import { formatDateServer, formatDateTimeServer } from '@/lib/server-timezone-display';
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
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { notFound } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Calendar,
  CreditCard,
  Package,
  Eye,
  Download,
} from 'lucide-react';
import { LeadAccessToggle } from './components/lead-access-toggle';
import { SubscriptionControls } from './components/subscription-controls';

interface ViewUserPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ViewUserPage({ params }: ViewUserPageProps) {
  await requireAdmin();

  const { id } = await params;
  const user = await userService.getUserById(id);

  if (!user) {
    notFound();
  }

  // Fetch user claims
  const supabase = await createClient();
  const { data: userClaims } = await supabase
    .from('user_claims')
    .select('*')
    .eq('user_id', id)
    .order('claimed_at', { ascending: false });

  // Fetch user claim leads with lead details
  const { data: claimLeads } = await supabase
    .from('user_claim_leads')
    .select(
      `
      *,
      user_claims!inner (
        id,
        type,
        claimed_at,
        user_id
      ),
      leads (
        id,
        full_name,
        street_address,
        city,
        state
      )
    `
    )
    .eq('user_claims.user_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Format user dates using configured timezone
  const userCreatedAt = await formatDateServer(user.created_at);
  const userUpdatedAt = await formatDateServer(user.updated_at);
  const subscriptionPeriodEnd = user.subscription_current_period_end
    ? await formatDateServer(user.subscription_current_period_end)
    : 'N/A';

  // Format claim dates
  const formattedClaims = userClaims
    ? await Promise.all(
        userClaims.map(async (claim: any) => ({
          ...claim,
          claimedAtFormatted: await formatDateTimeServer(claim.claimed_at),
          viewedAtFormatted: claim.viewed_at
            ? await formatDateTimeServer(claim.viewed_at)
            : null,
          downloadedAtFormatted: claim.downloaded_at
            ? await formatDateTimeServer(claim.downloaded_at)
            : null,
        }))
      )
    : [];

  // Format claim lead dates
  const formattedClaimLeads = claimLeads
    ? await Promise.all(
        claimLeads.map(async (claimLead: any) => ({
          ...claimLead,
          createdAtFormatted: await formatDateTimeServer(claimLead.created_at),
        }))
      )
    : [];

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
              <BreadcrumbLink href="/admin/users">Users</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{user.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* User Information Card */}
          <Card className="col-span-2 md:col-span-1">
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Basic user account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Name</Label>
                <p className="text-sm font-medium">{user.name}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Email</Label>
                <p className="text-sm font-medium">{user.email}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Role</Label>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
              </div>

              <div className="flex items-center gap-2 pt-4">
                {user.email_verified ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Email Verified</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600">Email Not Verified</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Status Card */}
          <Card className="col-span-2 md:col-span-1">
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
              <CardDescription>Current account state and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">Login Status</span>
                <Badge
                  variant="outline"
                  className={
                    user.is_logged_in
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }
                >
                  {user.is_logged_in ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">Lead Access</span>
                <LeadAccessToggle userId={user.id} enabled={user.lead_access || false} />
              </div>

              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created: {userCreatedAt}</span>
              </div>

              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Updated: {userUpdatedAt}</span>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Information Card */}
          <Card className="col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <CardTitle>Subscription Information</CardTitle>
              </div>
              <CardDescription>Stripe subscription and billing details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Subscription Plan</Label>
                  {user.subscription_plan ? (
                    <Badge
                      variant="outline"
                      className={
                        user.subscription_plan === 'diamond-lead'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }
                    >
                      {user.subscription_plan === 'diamond-lead' ? 'Diamond Lead' : 'Dollar Lead'}
                    </Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active plan</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  {user.subscription_status ? (
                    <Badge
                      variant="outline"
                      className={
                        user.subscription_status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : user.subscription_status === 'trialing'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                      }
                    >
                      {user.subscription_status}
                    </Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground">None</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Current Period End</Label>
                  <p className="text-sm font-medium">{subscriptionPeriodEnd}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Stripe Customer ID</Label>
                  <p className="text-sm font-mono">{user.stripe_customer_id || 'Not set'}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Stripe Subscription ID</Label>
                  <p className="text-sm font-mono">{user.stripe_subscription_id || 'Not set'}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Trial Status</Label>
                  <div>
                    {user.has_used_trial ? (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        Trial Used
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Trial Available
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin Subscription Controls */}
              {user.subscription_status === 'active' && user.subscription_plan && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Manage Subscription</h4>
                      <p className="text-sm text-muted-foreground">
                        Upgrade or downgrade this user's plan
                      </p>
                    </div>
                    <SubscriptionControls
                      userId={user.id}
                      currentPlan={user.subscription_plan as 'dollar-lead' | 'diamond-lead'}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Claims History Card */}
          <Card className="col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <CardTitle>Claims History</CardTitle>
              </div>
              <CardDescription>User&apos;s lead claim activity</CardDescription>
            </CardHeader>
            <CardContent>
              {formattedClaims && formattedClaims.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Leads</TableHead>
                        <TableHead>Claimed At</TableHead>
                        <TableHead>Viewed</TableHead>
                        <TableHead>Downloaded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formattedClaims.map((claim: any) => (
                        <TableRow key={claim.id}>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                claim.type === 'diamond-lead'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-green-50 text-green-700 border-green-200'
                              }
                            >
                              {claim.type === 'diamond-lead' ? 'Diamond' : 'Dollar'}
                            </Badge>
                          </TableCell>
                          <TableCell>{claim.lead_count}</TableCell>
                          <TableCell className="text-sm">{claim.claimedAtFormatted}</TableCell>
                          <TableCell>
                            {claim.viewed ? (
                              <div className="flex items-center gap-1">
                                <Eye className="h-4 w-4 text-green-600" />
                                <span className="text-xs text-muted-foreground">
                                  {claim.viewedAtFormatted || 'Yes'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {claim.downloaded ? (
                              <div className="flex items-center gap-1">
                                <Download className="h-4 w-4 text-green-600" />
                                <span className="text-xs text-muted-foreground">
                                  {claim.downloadedAtFormatted || 'Yes'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No claims history found
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Claimed Leads */}
          {formattedClaimLeads && formattedClaimLeads.length > 0 && (
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Recent Claimed Leads</CardTitle>
                <CardDescription>Last 50 individual leads claimed by this user</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Claimed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formattedClaimLeads.map((claimLead: any) => (
                        <TableRow key={claimLead.id}>
                          <TableCell className="font-medium">
                            {claimLead.leads?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {claimLead.leads?.street_address || 'N/A'}
                          </TableCell>
                          <TableCell>{claimLead.leads?.city || 'N/A'}</TableCell>
                          <TableCell>{claimLead.leads?.state || 'N/A'}</TableCell>
                          <TableCell className="text-sm">
                            {claimLead.createdAtFormatted}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
