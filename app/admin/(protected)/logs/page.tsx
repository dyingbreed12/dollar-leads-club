import { requireAdmin } from '@/lib/auth-utils';
import { systemLogService } from '@/services/system-log.service';
import { formatDateServer, formatTimeServer } from '@/lib/server-timezone-display';
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
import { Database, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SystemLogsPage({ searchParams }: PageProps) {
  await requireAdmin();

  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const eventTypeFilter = typeof params.event_type === 'string' ? params.event_type : undefined;

  // Fetch system logs with filters and pagination
  const filters = eventTypeFilter ? { event_type: eventTypeFilter } : undefined;
  const logsResponse = await systemLogService.getSystemLogs(filters, {
    page: currentPage,
    limit: 20,
  });

  // Format log timestamps using configured timezone
  const formattedLogs = await Promise.all(
    logsResponse.data.map(async (log) => ({
      ...log,
      formattedDate: await formatDateServer(log.created_at),
      formattedTime: await formatTimeServer(log.created_at),
    }))
  );

  // Get distinct event types for filter dropdown
  const eventTypes = await systemLogService.getEventTypes();

  // Helper to get badge color based on event type
  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case 'auto_claim_execution':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Execution</Badge>;
      case 'auto_claim_error':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Error</Badge>;
      case 'insufficient_leads':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Warning</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">{eventType}</Badge>;
    }
  };

  // Format JSON data for display
  const formatEventData = (data: Record<string, unknown> | null) => {
    if (!data) return <span className="text-muted-foreground">No data</span>;

    return (
      <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-w-md">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  };

  // Build URL with query params
  const buildUrl = (page: number, eventType?: string) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    if (eventType) params.set('event_type', eventType);
    const queryString = params.toString();
    return queryString ? `/admin/logs?${queryString}` : '/admin/logs';
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
              <BreadcrumbPage>System Logs</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <div>
                  <CardTitle>System Logs</CardTitle>
                  <CardDescription>
                    View system events, errors, and auto-claim execution logs
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Total: {logsResponse.total} logs
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filter by Event Type:</span>
              </div>
              <div className="flex gap-2">
                <Link href={buildUrl(1)}>
                  <Button
                    variant={!eventTypeFilter ? 'default' : 'outline'}
                    size="sm"
                  >
                    All
                  </Button>
                </Link>
                {eventTypes.map((type) => (
                  <Link key={type} href={buildUrl(1, type)}>
                    <Button
                      variant={eventTypeFilter === type ? 'default' : 'outline'}
                      size="sm"
                    >
                      {type.replace(/_/g, ' ')}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Event Type</TableHead>
                    <TableHead>Event Data</TableHead>
                    <TableHead className="w-[200px]">Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formattedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No system logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    formattedLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getEventTypeBadge(log.event_type)}
                            <span className="text-xs text-muted-foreground font-mono">
                              {log.id.slice(0, 8)}...
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatEventData(log.event_data)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{log.formattedDate}</span>
                            <span className="text-xs text-muted-foreground">{log.formattedTime}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {logsResponse.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {logsResponse.page} of {logsResponse.totalPages}
                </div>
                <div className="flex items-center gap-2">
                  {currentPage > 1 ? (
                    <Link href={buildUrl(currentPage - 1, eventTypeFilter)}>
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

                  {/* Page numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, logsResponse.totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (logsResponse.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= logsResponse.totalPages - 2) {
                        pageNum = logsResponse.totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <Link key={pageNum} href={buildUrl(pageNum, eventTypeFilter)}>
                          <Button
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            className="w-8"
                          >
                            {pageNum}
                          </Button>
                        </Link>
                      );
                    })}
                  </div>

                  {currentPage < logsResponse.totalPages ? (
                    <Link href={buildUrl(currentPage + 1, eventTypeFilter)}>
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
          </CardContent>
        </Card>
      </div>
    </>
  );
}
