'use client';

import { useState, useEffect } from 'react';
import { LeadType } from '@/types/lead-batch.types';
import { ClaimEligibility, TodaysClaimData, ClaimHistoryItem } from '@/types/lead.types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, Sparkles, Loader2, AlertCircle, CreditCard, Lock } from 'lucide-react';
import { TodaysLeadsTable } from './todays-leads-table';
import { ClaimHistoryGrid } from './claim-history-grid';
import { CountdownTimer } from './countdown-timer';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { useTimezone } from '@/hooks/use-timezone';
import { useIsMobile } from '@/hooks/use-mobile';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  getTodaysLeadsAction,
  getClaimEligibilityAction,
  claimLeadsAction,
  markClaimViewedAction,
  getClaimHistoryAction,
  getAllClaimedLeadsAction,
  getNextClaimTimeAction,
} from '@/actions/lead-claim.actions';
import { generateLeadsCSV, downloadCSV, generateAllLeadsFileName } from '@/lib/csv-generator';

interface LeadClaimPanelProps {
  userSubscriptionPlan: string | null;
  leadAccess: boolean;
}

export function LeadClaimPanel({ userSubscriptionPlan, leadAccess }: LeadClaimPanelProps) {
  const [activeTab, setActiveTab] = useState<LeadType>('dollar-lead');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for current tab
  const [todaysClaimData, setTodaysClaimData] = useState<TodaysClaimData | null>(null);
  const [unviewedClaim, setUnviewedClaim] = useState<TodaysClaimData | null>(null);
  const [eligibility, setEligibility] = useState<ClaimEligibility | null>(null);
  const [claimHistory, setClaimHistory] = useState<ClaimHistoryItem[]>([]);
  const [nextClaimInfo, setNextClaimInfo] = useState<{
    nextClaimDate: Date;
    message: string;
    isWaitingForCronjob: boolean;
  } | null>(null);

  // Action states
  const [claiming, setClaiming] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Use timezone hook for date formatting
  const { formatDate, timezone } = useTimezone();

  // Detect mobile for responsive behavior
  const isMobile = useIsMobile();

  // Check if user can access Diamond tab
  const canAccessDiamond = userSubscriptionPlan === 'diamond-lead';

  useEffect(() => {
    loadPageData();
  }, [activeTab]);

  // Ensure non-Diamond users can't access Diamond tab
  useEffect(() => {
    if (!canAccessDiamond && activeTab === 'diamond-lead') {
      setActiveTab('dollar-lead');
    }
  }, [canAccessDiamond, activeTab]);

  const loadPageData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load eligibility
      const eligibilityResult = await getClaimEligibilityAction(activeTab);
      if (eligibilityResult.success && eligibilityResult.data) {
        setEligibility(eligibilityResult.data);
      } else {
        throw new Error(eligibilityResult.error || 'Failed to load eligibility');
      }

      // Load today's claim
      const todaysResult = await getTodaysLeadsAction(activeTab);
      if (todaysResult.success) {
        if (todaysResult.data) {
          const claim = todaysResult.data;

          if (claim.claim.viewed) {
            // Already viewed - show leads immediately
            setUnviewedClaim(null);
            setTodaysClaimData(claim);
          } else {
            // Claim exists but not viewed yet - require button click
            setUnviewedClaim(claim);
            setTodaysClaimData(null);
          }
        } else {
          setUnviewedClaim(null);
          setTodaysClaimData(null);
        }
      }

      // Load next claim time info
      const nextClaimResult = await getNextClaimTimeAction(activeTab);
      if (nextClaimResult.success && nextClaimResult.data) {
        setNextClaimInfo({
          nextClaimDate: new Date(nextClaimResult.data.nextClaimDate),
          message: nextClaimResult.data.message,
          isWaitingForCronjob: nextClaimResult.data.isWaitingForCronjob,
        });
      }

      // Load claim history
      const historyResult = await getClaimHistoryAction(activeTab);
      if (historyResult.success && historyResult.data) {
        setClaimHistory(historyResult.data);
      }
    } catch (err) {
      console.error('Error loading page data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load lead information');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLeads = async () => {
    setClaiming(true);
    setError(null);

    try {
      if (unviewedClaim) {
        // Mark existing claim as viewed
        await markClaimViewedAction(unviewedClaim.claim.id);
        setTodaysClaimData(unviewedClaim);
        setUnviewedClaim(null);
        await loadPageData();
      }
    } catch (err) {
      console.error('Error viewing leads:', err);
      setError(err instanceof Error ? err.message : 'Failed to view leads');
    } finally {
      setClaiming(false);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    setError(null);

    try {
      const result = await getAllClaimedLeadsAction(activeTab);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch leads');
      }

      const includeRecording = activeTab === 'diamond-lead';
      const csvContent = generateLeadsCSV(result.data, includeRecording);
      const fileName = generateAllLeadsFileName(activeTab);

      downloadCSV(csvContent, fileName);
    } catch (err) {
      console.error('Error downloading all leads:', err);
      setError(err instanceof Error ? err.message : 'Failed to download leads');
    } finally {
      setDownloadingAll(false);
    }
  };

  const renderClaimSection = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }

    // Priority 1: Show today's leads if already viewed
    if (todaysClaimData) {
      return (
        <div className="space-y-4">
          <h3 className={cn("font-medium", isMobile ? "text-base" : "text-lg")}>
            Today&apos;s Leads ({formatDate(new Date())})
          </h3>
          <TodaysLeadsTable
            leads={todaysClaimData.leads}
            showRecording={activeTab === 'diamond-lead'}
          />
          {/* Show countdown to next claim */}
          {nextClaimInfo && (
            <div className="mt-4 pt-4 border-t">
              <CountdownTimer
                targetDate={nextClaimInfo.nextClaimDate}
                label="Next claim available in:"
                onComplete={loadPageData}
              />
            </div>
          )}
        </div>
      );
    }

    // Priority 2: Show "View" button if claim exists but not viewed
    if (unviewedClaim) {
      return (
        <div className="text-center py-6 md:py-8 space-y-4">
          <p className={cn("font-medium text-green-600", isMobile ? "text-base" : "text-lg")}>
            Your leads are ready!
          </p>
          <Button
            size="lg"
            onClick={handleViewLeads}
            disabled={claiming}
            className={cn("min-h-11 px-6 md:px-8", isMobile && "w-full sm:w-auto")}
          >
            {claiming ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Loading Leads...
              </>
            ) : (
              "VIEW TODAY'S LEADS"
            )}
          </Button>
        </div>
      );
    }

    // Priority 3: Show countdown timer (no manual claim button!)
    if (nextClaimInfo) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-6 md:py-8 space-y-4 px-4">
          <p className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-base")}>
            {nextClaimInfo.isWaitingForCronjob
              ? `Your new ${eligibility?.expectedLeadCount || 0} leads will arrive soon!`
              : nextClaimInfo.message}
          </p>
          <CountdownTimer
            targetDate={nextClaimInfo.nextClaimDate}
            label={nextClaimInfo.isWaitingForCronjob ? 'Leads arriving in:' : 'Next claim in:'}
            onComplete={loadPageData}
          />
        </div>
      );
    }

    return (
      <div className="text-center py-6 md:py-8 text-muted-foreground text-sm md:text-base">
        Loading claim information...
      </div>
    );
  };

  // Show message if user has no subscription
  if (!userSubscriptionPlan) {
    return (
      <div className="flex flex-col items-center justify-center py-8 md:py-12 space-y-4 px-4">
        <CreditCard className={cn("text-muted-foreground", isMobile ? "size-10" : "size-12")} />
        <div className="text-center space-y-2">
          <h3 className={cn("font-semibold", isMobile ? "text-base" : "text-lg")}>
            No Active Subscription
          </h3>
          <p className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-base")}>
            You need an active subscription to access and claim leads.
          </p>
        </div>
        <Link href="/dashboard/pricing" className={cn(isMobile && "w-full")}>
          <Button className={cn("min-h-11", isMobile && "w-full")}>
            View Pricing Plans
          </Button>
        </Link>
      </div>
    );
  }

  // Show message if user has no lead access
  if (!leadAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-8 md:py-12 space-y-4 px-4">
        <Lock className={cn("text-muted-foreground", isMobile ? "size-10" : "size-12")} />
        <div className="text-center space-y-2">
          <h3 className={cn("font-semibold", isMobile ? "text-base" : "text-lg")}>
            Lead Access Not Enabled
          </h3>
          <p className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-base")}>
            Your account doesn&apos;t have lead access enabled. Please contact support for assistance.
          </p>
        </div>
        <Link href="/dashboard/support" className={cn(isMobile && "w-full")}>
          <Button className={cn("min-h-11", isMobile && "w-full")}>
            Contact Support
          </Button>
        </Link>
      </div>
    );
  }

  const tabContent = (
    <div className="space-y-4 md:space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as LeadType)}
        className="w-full"
      >
        <TabsList className={cn(
          "grid w-full bg-gray-100 p-1",
          canAccessDiamond ? "grid-cols-2" : "grid-cols-1",
          isMobile ? "h-10" : "h-11"
        )}>
          <TabsTrigger
            value="dollar-lead"
            className={cn("gap-1.5 md:gap-2", isMobile ? "h-8 text-sm" : "h-9 text-base")}
          >
            <DollarSign className={cn(isMobile ? "size-3.5" : "size-4")} />
            <span className={cn(isMobile && "text-xs")}>Dollar Leads</span>
          </TabsTrigger>
          {canAccessDiamond && (
            <TabsTrigger
              value="diamond-lead"
              className={cn("gap-1.5 md:gap-2", isMobile ? "h-8 text-sm" : "h-9 text-base")}
            >
              <Sparkles className={cn(isMobile ? "size-3.5" : "size-4")} />
              <span className={cn(isMobile && "text-xs")}>Diamond Leads</span>
            </TabsTrigger>
          )}
        </TabsList>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="size-4" />
            <AlertDescription className={cn(isMobile && "text-sm")}>{error}</AlertDescription>
          </Alert>
        )}

        {/* Dollar Leads Tab */}
        <TabsContent value="dollar-lead" className="space-y-4 md:space-y-6 mt-4">
          {renderClaimSection()}

          {/* Claim History */}
          {!loading && claimHistory.length > 0 && (
            <div className="space-y-3 md:space-y-4">
              <h3 className={cn("font-medium", isMobile ? "text-base" : "text-lg")}>
                Previous Claims
              </h3>
              <ClaimHistoryGrid
                claims={claimHistory}
                onDownloadAll={handleDownloadAll}
                downloadingAll={downloadingAll}
              />
            </div>
          )}
        </TabsContent>

        {/* Diamond Leads Tab */}
        <TabsContent value="diamond-lead" className="space-y-4 md:space-y-6 mt-4">
          {renderClaimSection()}

          {/* Claim History */}
          {!loading && claimHistory.length > 0 && (
            <div className="space-y-3 md:space-y-4">
              <h3 className={cn("font-medium", isMobile ? "text-base" : "text-lg")}>
                Previous Claims
              </h3>
              <ClaimHistoryGrid
                claims={claimHistory}
                onDownloadAll={handleDownloadAll}
                downloadingAll={downloadingAll}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <PullToRefresh onRefresh={async () => await loadPageData()}>
      {tabContent}
    </PullToRefresh>
  );
}
