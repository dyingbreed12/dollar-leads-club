'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Link2, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { runClaimsReconciliationAction } from '@/actions/settings.actions';

interface ReconciliationStats {
  orphaned_leads: number;
  orphaned_claims: number;
  total_claimed_leads: number;
  total_claims: number;
}

interface ReconciliationResult {
  total_orphaned_leads: number;
  total_orphaned_claims: number;
  leads_linked: number;
  claims_fixed: number;
  errors: string[];
}

export function ReconcileClaimsCard() {
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);
  const [lastResult, setLastResult] = useState<ReconciliationResult | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/settings/reconcile-claims', {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      } else {
        toast.error('Failed to fetch reconciliation statistics');
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to fetch reconciliation statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleReconcile = async () => {
    setIsReconciling(true);
    setLastResult(null);

    try {
      const result = await runClaimsReconciliationAction();

      if (result.success && result.data) {
        setLastResult(result.data);
        toast.success(result.message || 'Reconciliation completed successfully');
        // Refresh stats after reconciliation
        await fetchStats();
      } else {
        toast.error(result.error || 'Failed to run reconciliation');
      }
    } catch (error) {
      console.error('Error running reconciliation:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsReconciling(false);
    }
  };

  const hasOrphanedData = stats && (stats.orphaned_leads > 0 || stats.orphaned_claims > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Link2 className="h-5 w-5 text-purple-600" />
          Reconcile Claim Data
        </CardTitle>
        <CardDescription>
          Fix missing links between claimed leads and user_claims. This repairs data where leads are
          marked as claimed but not properly linked to their claim records.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading statistics...
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <span className="text-xs text-muted-foreground block">Orphaned Leads</span>
              <p className={`font-semibold text-lg ${stats.orphaned_leads > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {stats.orphaned_leads}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <span className="text-xs text-muted-foreground block">Orphaned Claims</span>
              <p className={`font-semibold text-lg ${stats.orphaned_claims > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {stats.orphaned_claims}
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <span className="text-xs text-muted-foreground block">Total Claimed Leads</span>
              <p className="font-semibold text-lg">{stats.total_claimed_leads}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <span className="text-xs text-muted-foreground block">Total Claims</span>
              <p className="font-semibold text-lg">{stats.total_claims}</p>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">Unable to load statistics</div>
        )}

        {/* Status Badge */}
        {stats && (
          <div className="flex items-center gap-2">
            {hasOrphanedData ? (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  Data reconciliation needed
                </Badge>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  All data is properly linked
                </Badge>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={isLoading || isReconciling}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Stats
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="default"
                className="bg-purple-600 hover:bg-purple-700"
                disabled={isReconciling || !hasOrphanedData}
              >
                {isReconciling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reconciling...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Run Reconciliation
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Run Claims Reconciliation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will analyze all claimed leads and link them to their corresponding user_claims
                  records.
                  <br />
                  <br />
                  The system will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Find claimed leads without junction table entries</li>
                    <li>Match them to user_claims based on user_id and type</li>
                    <li>Create missing links in user_claim_leads table</li>
                    <li>Log the reconciliation for audit purposes</li>
                  </ul>
                  <br />
                  <span className="text-purple-600 font-medium">
                    Current status: {stats?.orphaned_leads || 0} orphaned leads, {stats?.orphaned_claims || 0}{' '}
                    orphaned claims
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReconcile}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Run Reconciliation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Results Display */}
        {lastResult && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Last Reconciliation Results:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Leads Linked:</span>
                <p className="font-medium text-lg text-green-600">{lastResult.leads_linked}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Claims Fixed:</span>
                <p className="font-medium text-lg text-green-600">{lastResult.claims_fixed}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Orphaned Found:</span>
                <p className="font-medium text-lg">{lastResult.total_orphaned_leads}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Errors:</span>
                <p
                  className={`font-medium text-lg ${lastResult.errors.length > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {lastResult.errors.length}
                </p>
              </div>
            </div>
            {lastResult.errors.length > 0 && (
              <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
                <strong>Errors:</strong>
                <ul className="list-disc list-inside mt-1">
                  {lastResult.errors.slice(0, 5).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {lastResult.errors.length > 5 && (
                    <li>...and {lastResult.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
