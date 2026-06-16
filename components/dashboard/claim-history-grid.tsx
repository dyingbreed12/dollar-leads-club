'use client';

import { useState } from 'react';
import { ClaimHistoryItem } from '@/types/lead.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetTrigger,
} from '@/components/ui/bottom-sheet';
import { Download, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown, Loader2, Filter } from 'lucide-react';
import { useTimezone } from '@/hooks/use-timezone';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { getClaimLeadsAction, markClaimDownloadedAction } from '@/actions/lead-claim.actions';
import { generateLeadsCSV, downloadCSV, generateLeadsFileName } from '@/lib/csv-generator';

interface ClaimHistoryGridProps {
  claims: ClaimHistoryItem[];
  onDownloadAll?: () => void;
  downloadingAll?: boolean;
}

type SortField = 'type' | 'lead_count' | 'claimed_at' | 'status';
type SortDirection = 'asc' | 'desc';

export function ClaimHistoryGrid({
  claims,
  onDownloadAll,
  downloadingAll = false,
}: ClaimHistoryGridProps) {
  const [sortField, setSortField] = useState<SortField>('claimed_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [downloadingClaim, setDownloadingClaim] = useState<string | null>(null);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  // Use timezone hook for date formatting
  const { formatDate, timezone } = useTimezone();

  // Detect mobile for responsive behavior
  const isMobile = useIsMobile();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedClaims = () => {
    const claimsCopy = [...claims];

    return claimsCopy.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'lead_count':
          comparison = a.lead_count - b.lead_count;
          break;
        case 'claimed_at':
          comparison = new Date(a.claimed_at).getTime() - new Date(b.claimed_at).getTime();
          break;
        case 'status':
          comparison = (a.downloaded === b.downloaded) ? 0 : a.downloaded ? 1 : -1;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const handleDownloadClaim = async (claim: ClaimHistoryItem) => {
    setDownloadingClaim(claim.id);

    try {
      const result = await getClaimLeadsAction(claim.id);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch leads');
      }

      const includeRecording = claim.type === 'diamond-lead';
      const csvContent = generateLeadsCSV(result.data, includeRecording);
      const fileName = generateLeadsFileName(claim.type, new Date(claim.claimed_at));

      downloadCSV(csvContent, fileName);

      if (!claim.downloaded) {
        await markClaimDownloadedAction(claim.id);
      }
    } catch (error) {
      console.error('Error downloading claim:', error);
      alert('Failed to download leads: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDownloadingClaim(null);
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field;
    const Icon = isActive
      ? sortDirection === 'asc'
        ? ArrowUp
        : ArrowDown
      : ArrowUpDown;

    return (
      <TableHead>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 data-[state=open]:bg-accent"
          onClick={() => handleSort(field)}
        >
          {children}
          <Icon className={`ml-2 size-4 ${isActive ? 'opacity-100' : 'opacity-50'}`} />
        </Button>
      </TableHead>
    );
  };

  if (claims.length === 0) {
    return (
      <div className={cn(
        "text-center py-8 text-muted-foreground",
        isMobile ? "text-sm" : "text-base"
      )}>
        No claim history yet
      </div>
    );
  }

  const sortedClaims = getSortedClaims();

  // Mobile Card View
  const renderMobileCards = () => (
    <div className="space-y-3">
      {sortedClaims.map((claim) => (
        <Card key={claim.id} className="overflow-hidden">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">
                  {claim.type === 'dollar-lead' ? 'Dollar Leads' : 'Diamond Leads'}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(new Date(claim.claimed_at))}
                </p>
              </div>
              {claim.downloaded ? (
                <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                  <CheckCircle2 className="size-3 text-green-600" />
                  Downloaded
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs shrink-0">Pending</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{claim.lead_count}</span> leads
              </div>
              <Button
                variant={claim.downloaded ? 'outline' : 'default'}
                size="sm"
                onClick={() => handleDownloadClaim(claim)}
                disabled={downloadingClaim === claim.id}
                className="min-h-9 shrink-0"
              >
                {downloadingClaim === claim.id ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    <span className="text-xs">Downloading...</span>
                  </>
                ) : (
                  <>
                    <Download className="size-3.5 mr-1.5" />
                    <span className="text-xs">Download</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Desktop Table View
  const renderDesktopTable = () => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="type">Type</SortableHeader>
            <SortableHeader field="lead_count">Lead Count</SortableHeader>
            <SortableHeader field="claimed_at">Claimed Date</SortableHeader>
            <SortableHeader field="status">Status</SortableHeader>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedClaims.map((claim) => (
            <TableRow key={claim.id}>
              <TableCell className="font-medium">
                {claim.type === 'dollar-lead' ? 'Dollar Leads' : 'Diamond Leads'}
              </TableCell>
              <TableCell>{claim.lead_count}</TableCell>
              <TableCell>{formatDate(new Date(claim.claimed_at))}</TableCell>
              <TableCell>
                {claim.downloaded ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="size-3 text-green-600" />
                    Downloaded
                  </Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant={claim.downloaded ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => handleDownloadClaim(claim)}
                  disabled={downloadingClaim === claim.id}
                >
                  {downloadingClaim === claim.id ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="size-4 mr-2" />
                      Download
                    </>
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header with download all and sort buttons */}
      <div className={cn(
        "flex items-center gap-2",
        isMobile ? "justify-between" : "justify-end"
      )}>
        {/* Sort button (mobile only) */}
        {isMobile && (
          <BottomSheet open={sortSheetOpen} onOpenChange={setSortSheetOpen}>
            <BottomSheetTrigger asChild>
              <Button variant="outline" size="sm" className="min-h-9">
                <Filter className="size-3.5 mr-1.5" />
                <span className="text-xs">Sort</span>
              </Button>
            </BottomSheetTrigger>
            <BottomSheetContent>
              <BottomSheetHeader className="p-4">
                <BottomSheetTitle>Sort Claims</BottomSheetTitle>
              </BottomSheetHeader>
              <div className="p-4 space-y-2">
                {[
                  { field: 'claimed_at' as SortField, label: 'Claimed Date' },
                  { field: 'type' as SortField, label: 'Type' },
                  { field: 'lead_count' as SortField, label: 'Lead Count' },
                  { field: 'status' as SortField, label: 'Status' },
                ].map(({ field, label }) => (
                  <BottomSheetClose key={field} asChild>
                    <Button
                      variant={sortField === field ? 'default' : 'ghost'}
                      className="w-full justify-between min-h-11"
                      onClick={() => handleSort(field)}
                    >
                      <span>{label}</span>
                      {sortField === field && (
                        sortDirection === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />
                      )}
                    </Button>
                  </BottomSheetClose>
                ))}
              </div>
            </BottomSheetContent>
          </BottomSheet>
        )}

        {/* Download All button */}
        {onDownloadAll && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadAll}
            disabled={downloadingAll}
            className={cn("min-h-9", isMobile && "flex-1")}
          >
            {downloadingAll ? (
              <>
                <Loader2 className={cn("animate-spin", isMobile ? "size-3.5 mr-1.5" : "size-4 mr-2")} />
                <span className={cn(isMobile && "text-xs")}>Downloading...</span>
              </>
            ) : (
              <>
                <Download className={cn(isMobile ? "size-3.5 mr-1.5" : "size-4 mr-2")} />
                <span className={cn(isMobile && "text-xs")}>Download All</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Render mobile cards or desktop table */}
      {isMobile ? renderMobileCards() : renderDesktopTable()}
    </div>
  );
}
