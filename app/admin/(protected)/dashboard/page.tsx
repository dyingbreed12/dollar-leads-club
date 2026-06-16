import { requireAdmin } from '@/lib/auth-utils';
import { userService } from '@/services/user.service';
import { leadService } from '@/services/lead.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, TrendingUp, Gem, Shield, Target, Package, AlertTriangle, CheckCircle, Calendar, BoxIcon } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

export default async function AdminDashboardPage() {
  const session = await requireAdmin();

  // Fetch membership statistics (only users with role='user')
  const dollarMembers = await userService.getUserCount({
    role: 'user',
    subscription_plan: 'dollar-lead',
    lead_access: true,
  });
  const diamondMembers = await userService.getUserCount({
    role: 'user',
    subscription_plan: 'diamond-lead',
    lead_access: true,
  });


  const totalDollarMembers = await userService.getUserCount({
    role: 'user',
    subscription_plan: 'dollar-lead',
  });
  const totalDiamondMembers = await userService.getUserCount({
    role: 'user',
    subscription_plan: 'diamond-lead',
  });

  const totalAllMembers = await userService.getUserCount({ role: 'user' });


  
  const totalMembers = await userService.getUserCount({ role: 'user', lead_access: true, });

  // Calculate Daily Lead Requirements
  const diamondLeadsRequired = diamondMembers * 2;
  const dollarLeadsRequired = (diamondMembers * 10) + (dollarMembers * 5);
  const totalLeadsRequired = diamondLeadsRequired + dollarLeadsRequired;

  // Calculate Weekly Projections (Daily * 7)
  const weeklyDiamondRequired = diamondLeadsRequired * 7;
  const weeklyDollarRequired = dollarLeadsRequired * 7;
  const weeklyTotalRequired = weeklyDiamondRequired + weeklyDollarRequired;

  // Calculate Monthly Projections (Daily * 30)
  const monthlyDiamondRequired = diamondLeadsRequired * 30;
  const monthlyDollarRequired = dollarLeadsRequired * 30;
  const monthlyTotalRequired = monthlyDiamondRequired + monthlyDollarRequired;

  // Fetch available lead counts for inventory status
  const availableExclusiveLeads = await leadService.countLeads({
    type: 'diamond-lead',
    status: 'available',
  });
  const availableNonExclusiveLeads = await leadService.countLeads({
    type: 'dollar-lead',
    status: 'available',
  });

  // Calculate days remaining and status
  const getInventoryStatus = (available: number, dailyRequired: number) => {
    if (dailyRequired === 0) {
      return { daysRemaining: Infinity, status: 'good' as const };
    }
    const daysRemaining = Math.floor(available / dailyRequired);
    let status: 'good' | 'warning' | 'critical';
    if (daysRemaining >= 7) {
      status = 'good';
    } else if (daysRemaining >= 3) {
      status = 'warning';
    } else {
      status = 'critical';
    }
    return { daysRemaining, status };
  };

  const exclusiveInventory = getInventoryStatus(availableExclusiveLeads, diamondLeadsRequired);
  const nonExclusiveInventory = getInventoryStatus(availableNonExclusiveLeads, dollarLeadsRequired);

  const stats = [
    {
      title: 'Total Members',
      value: totalAllMembers,
      description: 'All registered members',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Dollar Members',
      value: totalDollarMembers,
      description: `${totalAllMembers > 0 ? Math.round((totalDollarMembers / totalAllMembers) * 100) : 0}% of total members`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Diamond Members',
      value: diamondMembers,
      description: `${totalAllMembers > 0 ? Math.round((totalDiamondMembers / totalAllMembers) * 100) : 0}% of total members`,
      icon: Gem,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  // Get recent users
  const recentUsers = await userService.getUsers({}, { limit: 5, page: 1 });

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Admin Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Welcome Section */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold">Welcome back, {session.user.name}</h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your platform today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Daily Lead Requirements */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              <CardTitle>Daily Lead Requirements</CardTitle>
            </div>
            <CardDescription>
              Total leads needed based on current membership
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Gem className="h-5 w-5 text-purple-600" />
                  <span className="text-2xl font-bold">{diamondLeadsRequired}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Diamond Leads</p>
                  <p className="text-xs text-muted-foreground">
                    {diamondMembers} members × 2 leads
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold">{dollarLeadsRequired}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Dollar Leads</p>
                  <p className="text-xs text-muted-foreground">
                    ({diamondMembers} × 10) + ({dollarMembers} × 5)
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold">{totalLeadsRequired}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Leads Required</p>
                  <p className="text-xs text-muted-foreground">
                    Daily target for all members
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Lead Requirements */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>Weekly Projected Requirements</CardTitle>
            </div>
            <CardDescription>
              Projected leads needed for 7 days based on current membership
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Gem className="h-5 w-5 text-purple-600" />
                  <span className="text-2xl font-bold">{weeklyDiamondRequired.toLocaleString()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Diamond Leads</p>
                  <p className="text-xs text-muted-foreground">
                    {diamondLeadsRequired} daily × 7 days
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold">{weeklyDollarRequired.toLocaleString()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Dollar Leads</p>
                  <p className="text-xs text-muted-foreground">
                    {dollarLeadsRequired} daily × 7 days
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold">{weeklyTotalRequired.toLocaleString()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Leads Required</p>
                  <p className="text-xs text-muted-foreground">
                    Weekly target for all members
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Lead Requirements */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>Monthly Projected Requirements</CardTitle>
            </div>
            <CardDescription>
              Projected leads needed for 30 days based on current membership
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Gem className="h-5 w-5 text-purple-600" />
                  <span className="text-2xl font-bold">{monthlyDiamondRequired.toLocaleString()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Diamond Leads</p>
                  <p className="text-xs text-muted-foreground">
                    {diamondLeadsRequired} daily × 30 days
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold">{monthlyDollarRequired.toLocaleString()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Dollar Leads</p>
                  <p className="text-xs text-muted-foreground">
                    {dollarLeadsRequired} daily × 30 days
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span className="text-2xl font-bold">{monthlyTotalRequired.toLocaleString()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Total Leads Required</p>
                  <p className="text-xs text-muted-foreground">
                    Monthly target for all members
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Inventory Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <CardTitle>Current Inventory Status</CardTitle>
            </div>
            <CardDescription>
              Available leads and days remaining at current consumption rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Exclusive (Diamond) Leads */}
              <div className="flex flex-col gap-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gem className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">Diamond Leads</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                      exclusiveInventory.status === 'good'
                        ? 'bg-green-100 text-green-700'
                        : exclusiveInventory.status === 'warning'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {exclusiveInventory.status === 'good' ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {exclusiveInventory.status === 'good'
                      ? 'Good'
                      : exclusiveInventory.status === 'warning'
                      ? 'Warning'
                      : 'Critical'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold">{availableExclusiveLeads}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{diamondLeadsRequired}</p>
                    <p className="text-xs text-muted-foreground">Daily Required</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {exclusiveInventory.daysRemaining === Infinity
                        ? '∞'
                        : exclusiveInventory.daysRemaining}
                    </p>
                    <p className="text-xs text-muted-foreground">Days Left</p>
                  </div>
                </div>
                {exclusiveInventory.status !== 'good' && (
                  <div
                    className={`text-xs p-2 rounded ${
                      exclusiveInventory.status === 'warning'
                        ? 'bg-yellow-50 text-yellow-800'
                        : 'bg-red-50 text-red-800'
                    }`}
                  >
                    {exclusiveInventory.status === 'critical'
                      ? 'Critical: Less than 3 days of inventory remaining!'
                      : 'Warning: Less than 7 days of inventory remaining'}
                  </div>
                )}
              </div>

              {/* Non-Exclusive (Dollar) Leads */}
              <div className="flex flex-col gap-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Dollar Leads</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                      nonExclusiveInventory.status === 'good'
                        ? 'bg-green-100 text-green-700'
                        : nonExclusiveInventory.status === 'warning'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {nonExclusiveInventory.status === 'good' ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {nonExclusiveInventory.status === 'good'
                      ? 'Good'
                      : nonExclusiveInventory.status === 'warning'
                      ? 'Warning'
                      : 'Critical'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold">{availableNonExclusiveLeads}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{dollarLeadsRequired}</p>
                    <p className="text-xs text-muted-foreground">Daily Required</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {nonExclusiveInventory.daysRemaining === Infinity
                        ? '∞'
                        : nonExclusiveInventory.daysRemaining}
                    </p>
                    <p className="text-xs text-muted-foreground">Days Left</p>
                  </div>
                </div>
                {nonExclusiveInventory.status !== 'good' && (
                  <div
                    className={`text-xs p-2 rounded ${
                      nonExclusiveInventory.status === 'warning'
                        ? 'bg-yellow-50 text-yellow-800'
                        : 'bg-red-50 text-red-800'
                    }`}
                  >
                    {nonExclusiveInventory.status === 'critical'
                      ? 'Critical: Less than 3 days of inventory remaining!'
                      : 'Warning: Less than 7 days of inventory remaining'}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Users Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>
                Latest user registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentUsers.data.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-col">
                      <p className="text-sm font-medium leading-none">
                        {user.name}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {user.role}
                      </span>
                      {user.email_verified && (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <a
                  href="/admin/users"
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">Manage Users</span>
                </a>
                <a
                  href="/admin/analytics"
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">View Analytics</span>
                </a>
                <a
                  href="/admin/dlc-leads"
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <BoxIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">DLC Leads</span>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
