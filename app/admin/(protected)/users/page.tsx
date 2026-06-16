import { requireAdmin } from '@/lib/auth-utils';
import { userService } from '@/services/user.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { AddAdminDialog } from './components/add-admin-dialog';
import { AdminUsersTable } from './components/admin-users-table';
import { MembersTable } from './components/members-table';
import { UserFilters, UserResponseDTO, PaginatedResponse } from '@/types/user.types';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const ITEMS_PER_PAGE = 50;

export default async function UsersPage({ searchParams }: PageProps) {
  await requireAdmin();

  const params = await searchParams;
  const currentTab = (params.tab as string) || 'members';
  const searchQuery = typeof params.search === 'string' ? params.search : '';
  const planFilter = typeof params.plan === 'string' ? params.plan : '';
  const leadAccessFilter = typeof params.leadAccess === 'string' ? params.leadAccess : '';
  const currentPage = Math.max(1, parseInt((params.page as string) || '1', 10));

  // Fetch users based on current tab
  let users: UserResponseDTO[] = [];
  let totalUsers = 0;
  let totalPages = 1;

  if (currentTab === 'members') {
    // Build filters for members
    const filters: UserFilters = { role: 'user' };

    // Add subscription plan filter
    if (planFilter === 'dollar-lead' || planFilter === 'diamond-lead') {
      filters.subscription_plan = planFilter;
    }

    // Add lead access filter
    if (leadAccessFilter === 'enabled') {
      filters.lead_access = true;
    } else if (leadAccessFilter === 'disabled') {
      filters.lead_access = false;
    }

    // Add search filter for server-side search
    if (searchQuery) {
      filters.search = searchQuery;
    }

    let paginatedResult: PaginatedResponse<UserResponseDTO>;

    // Handle "no plan" filter - need to filter for null subscription_plan
    if (planFilter === 'none') {
      // For "no plan" we need to fetch all members without a plan
      // This requires a special query - get all users with role 'user' and no subscription_plan
      const allMembersFilters: UserFilters = { role: 'user' };
      if (searchQuery) {
        allMembersFilters.search = searchQuery;
      }

      // Get count of users with no plan
      const allMembers = await userService.getUsers(allMembersFilters, { limit: 1000, page: 1 });
      const membersWithNoPlan = allMembers.data.filter((u) => !u.subscription_plan);

      // Apply pagination manually for "no plan" filter
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      users = membersWithNoPlan.slice(offset, offset + ITEMS_PER_PAGE);
      totalUsers = membersWithNoPlan.length;
      totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);
    } else {
      paginatedResult = await userService.getUsers(filters, {
        limit: ITEMS_PER_PAGE,
        page: currentPage,
      });
      users = paginatedResult.data;
      totalUsers = paginatedResult.total;
      totalPages = paginatedResult.totalPages;
    }
  } else {
    // Admin tab
    const adminResult = await userService.getUsers(
      { role: 'admin' },
      { limit: ITEMS_PER_PAGE, page: currentPage }
    );
    users = adminResult.data;
    totalUsers = adminResult.total;
    totalPages = adminResult.totalPages;
  }

  // Get counts for both tabs (total counts, not filtered)
  const membersCount = await userService.getUserCount({ role: 'user' });
  const adminsCount = await userService.getUserCount({ role: 'admin' });

  const buildTabUrl = (tab: string) => {
    const urlParams = new URLSearchParams();
    urlParams.set('tab', tab);
    return `/admin/users?${urlParams.toString()}`;
  };

  const buildPageUrl = (page: number) => {
    const urlParams = new URLSearchParams();
    urlParams.set('tab', currentTab);
    if (searchQuery) urlParams.set('search', searchQuery);
    if (planFilter) urlParams.set('plan', planFilter);
    if (leadAccessFilter) urlParams.set('leadAccess', leadAccessFilter);
    urlParams.set('page', page.toString());
    return `/admin/users?${urlParams.toString()}`;
  };

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
              <BreadcrumbPage>Users</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>View and manage all registered users</CardDescription>
                </div>
              </div>
              {currentTab === 'admin' && <AddAdminDialog />}
            </div>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b">
              <Link href={buildTabUrl('members')}>
                <Button
                  variant={currentTab === 'members' ? 'default' : 'ghost'}
                  className="rounded-b-none"
                >
                  Members ({membersCount})
                </Button>
              </Link>
              <Link href={buildTabUrl('admin')}>
                <Button
                  variant={currentTab === 'admin' ? 'default' : 'ghost'}
                  className="rounded-b-none"
                >
                  Admins ({adminsCount})
                </Button>
              </Link>
            </div>

            {/* Members Tab */}
            {currentTab === 'members' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-muted-foreground">
                    Showing {users.length} of {totalUsers} members
                  </span>
                </div>

                <MembersTable
                  users={users}
                  searchQuery={searchQuery}
                  planFilter={planFilter}
                  leadAccessFilter={leadAccessFilter}
                  currentPage={currentPage}
                  totalPages={totalPages}
                />

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <Link href={buildPageUrl(currentPage - 1)}>
                      <Button variant="outline" size="sm" disabled={currentPage <= 1}>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Link href={buildPageUrl(currentPage + 1)}>
                      <Button variant="outline" size="sm" disabled={currentPage >= totalPages}>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}

            {/* Admin Tab */}
            {currentTab === 'admin' && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-muted-foreground">
                    Showing {users.length} of {totalUsers} admins
                  </span>
                </div>

                <AdminUsersTable
                  users={users}
                  currentPage={currentPage}
                  totalPages={totalPages}
                />

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <Link href={buildPageUrl(currentPage - 1)}>
                      <Button variant="outline" size="sm" disabled={currentPage <= 1}>
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Link href={buildPageUrl(currentPage + 1)}>
                      <Button variant="outline" size="sm" disabled={currentPage >= totalPages}>
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
