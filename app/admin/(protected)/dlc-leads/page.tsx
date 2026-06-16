import { requireAdmin } from '@/lib/auth-utils';
import { leadBatchService } from '@/services/lead-batch.service';
import { leadService } from '@/services/lead.service';
import { userService } from '@/services/user.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package, Plus, ChevronLeft, ChevronRight, Filter, Search, Gem, DollarSign, CheckCircle, Users, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { LeadBatchesTable } from './components/lead-batches-table';
import { LeadsTable } from './components/leads-table';
import { UserResponseDTO } from '@/types/user.types';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DLCLeadsPage({ searchParams }: PageProps) {
  await requireAdmin();

  const params = await searchParams;
  const currentTab = (params.tab as string) || 'batches';
  const currentPage = Number(params.page) || 1;
  const typeFilter = typeof params.type === 'string' ? params.type : undefined;
  const statusFilter = typeof params.status === 'string' ? params.status : undefined;
  const searchQuery = typeof params.search === 'string' ? params.search : undefined;

  // Fetch data based on current tab
  let batchesData = null;
  let leadsData = null;
  let membersData: UserResponseDTO[] = [];

  if (currentTab === 'batches') {
    const filters = typeFilter ? { type: typeFilter as 'dollar-lead' | 'diamond-lead' } : undefined;
    const allBatches = await leadBatchService.getAllLeadBatches(filters);

    // Fetch user data for all unique user_ids
    const uniqueUserIds = [...new Set(allBatches.map((b) => b.user_id))];
    const userMap = new Map<string, { id: string; name: string; email: string }>();

    await Promise.all(
      uniqueUserIds.map(async (userId) => {
        const user = await userService.getUserById(userId);
        if (user) {
          userMap.set(userId, { id: user.id, name: user.name, email: user.email });
        }
      })
    );

    // Enhance batches with user data
    const batchesWithUsers = allBatches.map((batch) => ({
      ...batch,
      user: userMap.get(batch.user_id) || undefined,
    }));

    const total = batchesWithUsers.length;
    const limit = 20;
    const offset = (currentPage - 1) * limit;
    const paginatedBatches = batchesWithUsers.slice(offset, offset + limit);

    batchesData = {
      data: paginatedBatches,
      total,
      page: currentPage,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } else {
    // Leads tab
    const limit = 20;
    const offset = (currentPage - 1) * limit;
    const pagination = { limit, offset };

    let result;

    if (searchQuery) {
      // Use search with pagination
      result = await leadService.searchLeadsWithPagination(searchQuery, pagination);

      // Apply additional filters if search was used
      // Note: For optimal performance, we should handle these filters server-side in the future
      // For now, we'll refetch with filters if needed
      if (typeFilter || statusFilter) {
        const filters: any = {};
        if (typeFilter) filters.type = typeFilter;
        if (statusFilter) filters.status = statusFilter;

        // Get all search results and filter client-side
        // This is a temporary solution - ideally, search should accept filters too
        const allSearchResults = await leadService.searchLeads(searchQuery);
        const filteredResults = allSearchResults.filter((lead) => {
          if (typeFilter && lead.type !== typeFilter) return false;
          if (statusFilter && lead.status !== statusFilter) return false;
          return true;
        });

        const total = filteredResults.length;
        const paginatedResults = filteredResults.slice(offset, offset + limit);

        result = {
          data: paginatedResults,
          total,
        };
      }
    } else {
      // Use filters with pagination
      const filters: any = {};
      if (typeFilter) filters.type = typeFilter;
      if (statusFilter) filters.status = statusFilter;

      result = await leadService.getAllLeadsWithPagination(filters, pagination);
    }

    leadsData = {
      data: result.data,
      total: result.total,
      page: currentPage,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };

    // Fetch members for assignment dropdown
    const membersResponse = await userService.getUsers({ role: 'user' });
    membersData = membersResponse.data;
  }

  // Fetch lead statistics
  const totalLeadsCount = await leadService.countLeads();
  const availableLeadsCount = await leadService.countLeads({ status: 'available' });
  const claimedLeadsCount = await leadService.countLeads({ status: 'claimed' });
  const expiredLeadsCount = await leadService.countLeads({ status: 'expired' });
  const diamondLeadsCount = await leadService.countLeads({ type: 'diamond-lead' });
  const dollarLeadsCount = await leadService.countLeads({ type: 'dollar-lead' });

  // Helper functions
  const getTypeBadge = (type: string) => {
    if (type === 'diamond-lead') {
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">Diamond</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Dollar</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Available</Badge>;
      case 'claimed':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Claimed</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Expired</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">{status}</Badge>;
    }
  };

  const buildUrl = (tab: string, page: number, type?: string, status?: string, search?: string) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (page > 1) params.set('page', page.toString());
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    return `/admin/dlc-leads?${params.toString()}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
              <BreadcrumbPage>DLC Leads</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Lead Statistics - Row 1: Lead Types */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Diamond Leads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Diamond Leads</CardTitle>
              <div className="p-2 rounded-full bg-purple-100">
                <Gem className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{diamondLeadsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total diamond leads in database
              </p>
            </CardContent>
          </Card>

          {/* Dollar Leads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dollar Leads</CardTitle>
              <div className="p-2 rounded-full bg-green-100">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dollarLeadsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Total dollar leads in database
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lead Statistics - Row 2: Lead Status */}
        <div className="grid gap-4 md:grid-cols-4">
          {/* Total Leads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <div className="p-2 rounded-full bg-blue-100">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLeadsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All leads in database
              </p>
            </CardContent>
          </Card>

          {/* Available Leads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{availableLeadsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Ready to be claimed
              </p>
            </CardContent>
          </Card>

          {/* Claimed Leads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Claimed</CardTitle>
              <div className="p-2 rounded-full bg-blue-100">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{claimedLeadsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Already claimed by users
              </p>
            </CardContent>
          </Card>

          {/* Expired Leads */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <div className="p-2 rounded-full bg-red-100">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expiredLeadsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                No longer available
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <div>
                  <CardTitle>DLC Leads Management</CardTitle>
                  <CardDescription>Manage lead batches and individual leads</CardDescription>
                </div>
              </div>
              <Link href="/admin/dlc-leads/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Batch
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b">
              <Link href={buildUrl('batches', 1)}>
                <Button
                  variant={currentTab === 'batches' ? 'default' : 'ghost'}
                  className="rounded-b-none"
                >
                  Lead Batches
                </Button>
              </Link>
              <Link href={buildUrl('leads', 1)}>
                <Button
                  variant={currentTab === 'leads' ? 'default' : 'ghost'}
                  className="rounded-b-none"
                >
                  All Leads
                </Button>
              </Link>
            </div>

            {/* Batches Tab */}
            {currentTab === 'batches' && batchesData && (
              <>
                {/* Filters */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filter by Type:</span>
                  </div>
                  <div className="flex gap-2">
                    <Link href={buildUrl('batches', 1)}>
                      <Button variant={!typeFilter ? 'default' : 'outline'} size="sm">
                        All
                      </Button>
                    </Link>
                    <Link href={buildUrl('batches', 1, 'dollar-lead')}>
                      <Button
                        variant={typeFilter === 'dollar-lead' ? 'default' : 'outline'}
                        size="sm"
                      >
                        Dollar
                      </Button>
                    </Link>
                    <Link href={buildUrl('batches', 1, 'diamond-lead')}>
                      <Button
                        variant={typeFilter === 'diamond-lead' ? 'default' : 'outline'}
                        size="sm"
                      >
                        Diamond
                      </Button>
                    </Link>
                  </div>
                  <span className="ml-auto text-sm text-muted-foreground">
                    Total: {batchesData.total} batches
                  </span>
                </div>

                {/* Table */}
                <LeadBatchesTable batches={batchesData.data} />

                {/* Pagination */}
                {batchesData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {batchesData.page} of {batchesData.totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      {currentPage > 1 ? (
                        <Link href={buildUrl('batches', currentPage - 1, typeFilter)}>
                          <Button variant="outline" size="sm">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                      )}
                      {currentPage < batchesData.totalPages ? (
                        <Link href={buildUrl('batches', currentPage + 1, typeFilter)}>
                          <Button variant="outline" size="sm">
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Leads Tab */}
            {currentTab === 'leads' && leadsData && (
              <>
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Type:</span>
                  </div>
                  <div className="flex gap-2">
                    <Link href={buildUrl('leads', 1, undefined, statusFilter, searchQuery)}>
                      <Button variant={!typeFilter ? 'default' : 'outline'} size="sm">
                        All
                      </Button>
                    </Link>
                    <Link href={buildUrl('leads', 1, 'dollar-lead', statusFilter, searchQuery)}>
                      <Button
                        variant={typeFilter === 'dollar-lead' ? 'default' : 'outline'}
                        size="sm"
                      >
                        Dollar
                      </Button>
                    </Link>
                    <Link href={buildUrl('leads', 1, 'diamond-lead', statusFilter, searchQuery)}>
                      <Button
                        variant={typeFilter === 'diamond-lead' ? 'default' : 'outline'}
                        size="sm"
                      >
                        Diamond
                      </Button>
                    </Link>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                  </div>
                  <div className="flex gap-2">
                    <Link href={buildUrl('leads', 1, typeFilter, undefined, searchQuery)}>
                      <Button variant={!statusFilter ? 'default' : 'outline'} size="sm">
                        All
                      </Button>
                    </Link>
                    <Link href={buildUrl('leads', 1, typeFilter, 'available', searchQuery)}>
                      <Button
                        variant={statusFilter === 'available' ? 'default' : 'outline'}
                        size="sm"
                      >
                        Available
                      </Button>
                    </Link>
                    <Link href={buildUrl('leads', 1, typeFilter, 'claimed', searchQuery)}>
                      <Button
                        variant={statusFilter === 'claimed' ? 'default' : 'outline'}
                        size="sm"
                      >
                        Claimed
                      </Button>
                    </Link>
                    <Link href={buildUrl('leads', 1, typeFilter, 'expired', searchQuery)}>
                      <Button
                        variant={statusFilter === 'expired' ? 'default' : 'outline'}
                        size="sm"
                      >
                        Expired
                      </Button>
                    </Link>
                  </div>

                  <span className="ml-auto text-sm text-muted-foreground">
                    Total: {leadsData.total} leads
                  </span>
                </div>

                {/* Search Form */}
                <form className="flex items-center gap-2 mb-4">
                  <input type="hidden" name="tab" value="leads" />
                  {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
                  {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      name="search"
                      placeholder="Search name, address, city..."
                      defaultValue={searchQuery || ''}
                      className="w-full pl-10 pr-4 py-2 border rounded-md text-sm"
                    />
                  </div>
                  <Button type="submit" size="sm">
                    Search
                  </Button>
                  {searchQuery && (
                    <Link href={buildUrl('leads', 1, typeFilter, statusFilter)}>
                      <Button variant="outline" size="sm">
                        Clear
                      </Button>
                    </Link>
                  )}
                </form>

                {/* Table */}
                <LeadsTable leads={leadsData.data} members={membersData} />

                {/* Pagination */}
                {leadsData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {leadsData.page} of {leadsData.totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      {currentPage > 1 ? (
                        <Link
                          href={buildUrl(
                            'leads',
                            currentPage - 1,
                            typeFilter,
                            statusFilter,
                            searchQuery
                          )}
                        >
                          <Button variant="outline" size="sm">
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            Previous
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                      )}
                      {currentPage < leadsData.totalPages ? (
                        <Link
                          href={buildUrl(
                            'leads',
                            currentPage + 1,
                            typeFilter,
                            statusFilter,
                            searchQuery
                          )}
                        >
                          <Button variant="outline" size="sm">
                            Next
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      ) : (
                        <Button variant="outline" size="sm" disabled>
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
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
