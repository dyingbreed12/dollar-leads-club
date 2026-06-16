'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Loader2, Save, RotateCcw, Clock, Users, Gem, DollarSign, Play, Calendar, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  updateAutoClaimConfigAction,
  resetAutoClaimConfigAction,
  toggleAutoClaimEnabledAction,
  runManualAutoClaimAction,
} from '@/actions/settings.actions';
import { AutoClaimConfig, UpdateAutoClaimConfigDTO } from '@/types/settings.types';
import { UserMultiSelect } from './user-multi-select';

interface SelectedUser {
  id: string;
  name: string;
  email: string;
  subscription_plan: string | null;
}

// Timezone options with UTC offsets (Standard Time, not DST)
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET) - UTC-5', offset: -5 },
  { value: 'America/Chicago', label: 'Central Time (CT) - UTC-6', offset: -6 },
  { value: 'America/Denver', label: 'Mountain Time (MT) - UTC-7', offset: -7 },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - UTC-8', offset: -8 },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT) - UTC-9', offset: -9 },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST) - UTC-10', offset: -10 },
  { value: 'UTC', label: 'UTC - UTC+0', offset: 0 },
  { value: 'Europe/London', label: 'London (GMT) - UTC+0', offset: 0 },
  { value: 'Europe/Paris', label: 'Paris (CET) - UTC+1', offset: 1 },
  { value: 'Europe/Berlin', label: 'Berlin (CET) - UTC+1', offset: 1 },
  { value: 'Asia/Dubai', label: 'Dubai (GST) - UTC+4', offset: 4 },
  { value: 'Asia/Singapore', label: 'Singapore (SGT) - UTC+8', offset: 8 },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST) - UTC+9', offset: 9 },
  { value: 'Australia/Sydney', label: 'Sydney (AEST) - UTC+10', offset: 10 },
];

// Calculate UTC hour from local hour and timezone offset
const calculateUtcHour = (localHour: number, timezoneValue: string): number => {
  const timezone = TIMEZONE_OPTIONS.find((tz) => tz.value === timezoneValue);
  if (!timezone) return localHour;

  // Convert local hour to UTC: UTC = Local - Offset
  let utcHour = localHour - timezone.offset;

  // Handle wrap-around
  if (utcHour < 0) utcHour += 24;
  if (utcHour >= 24) utcHour -= 24;

  return utcHour;
};

interface AutoClaimFormProps {
  initialConfig: AutoClaimConfig;
  lastUpdated: string;
}

export function AutoClaimForm({ initialConfig, lastUpdated }: AutoClaimFormProps) {
  const [config, setConfig] = useState<AutoClaimConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [manualRunDate, setManualRunDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRunningManual, setIsRunningManual] = useState(false);
  const [manualRunResult, setManualRunResult] = useState<{
    claims_created: number;
    leads_distributed: number;
    users_filled: number;
    errors: number;
  } | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);

  const handleToggleEnabled = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      const result = await toggleAutoClaimEnabledAction(enabled);

      if (result.success && result.data) {
        setConfig(result.data.config);
        setHasChanges(false);
        toast.success(result.message || `Auto-claim ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        toast.error(result.error || 'Failed to toggle auto-claim');
        // Revert the switch
        setConfig((prev) => ({ ...prev, enabled: !enabled }));
      }
    } catch {
      toast.error('An unexpected error occurred');
      setConfig((prev) => ({ ...prev, enabled: !enabled }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: UpdateAutoClaimConfigDTO = {
        schedule: config.schedule,
        plans: config.plans,
        logging: config.logging,
      };

      const result = await updateAutoClaimConfigAction(updates);

      if (result.success && result.data) {
        setConfig(result.data.config);
        setHasChanges(false);
        toast.success('Configuration saved successfully');
      } else {
        toast.error(result.error || 'Failed to save configuration');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await resetAutoClaimConfigAction();

      if (result.success && result.data) {
        setConfig(result.data.config);
        setHasChanges(false);
        toast.success('Configuration reset to defaults');
      } else {
        toast.error(result.error || 'Failed to reset configuration');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsResetting(false);
    }
  };

  const handleManualRun = async () => {
    setIsRunningManual(true);
    setManualRunResult(null);
    try {
      // Pass selected user IDs, or undefined for all users
      const userIds = selectedUsers.length > 0 ? selectedUsers.map((u) => u.id) : undefined;
      const result = await runManualAutoClaimAction(manualRunDate, userIds);

      if (result.success && result.data) {
        setManualRunResult({
          claims_created: result.data.claims_created,
          leads_distributed: result.data.leads_distributed,
          users_filled: result.data.users_filled,
          errors: result.data.errors,
        });
        toast.success(result.message || 'Manual auto-claim completed successfully');
      } else {
        toast.error(result.error || 'Failed to run manual auto-claim');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsRunningManual(false);
    }
  };

  const updatePlanConfig = (
    plan: 'dollar-lead' | 'diamond-lead',
    field: string,
    value: number | boolean
  ) => {
    setConfig((prev) => ({
      ...prev,
      plans: {
        ...prev.plans,
        [plan]: {
          ...prev.plans[plan],
          [field]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const updateSchedule = (field: string, value: number | string) => {
    setConfig((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  // Auto-calculate UTC hour when hour or timezone changes
  useEffect(() => {
    const newUtcHour = calculateUtcHour(config.schedule.hour, config.schedule.timezone);
    if (newUtcHour !== config.schedule.utc_hour) {
      setConfig((prev) => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          utc_hour: newUtcHour,
        },
      }));
      setHasChanges(true);
    }
  }, [config.schedule.hour, config.schedule.timezone]);

  const updateLogging = (field: string, value: boolean) => {
    setConfig((prev) => ({
      ...prev,
      logging: {
        ...prev.logging,
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Auto-Claim Status
              </CardTitle>
              <CardDescription>
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </CardDescription>
            </div>
            <Badge variant={config.enabled ? 'default' : 'secondary'} className="text-sm">
              {config.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-claim-toggle" className="text-base font-medium">
                Enable Auto-Claim
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically create daily claims for eligible users
              </p>
            </div>
            <Switch
              id="auto-claim-toggle"
              checked={config.enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Schedule Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schedule Configuration
          </CardTitle>
          <CardDescription>
            Set when the auto-claim job runs daily
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-hour">Hour (24h format)</Label>
              <Input
                id="schedule-hour"
                type="number"
                min={0}
                max={23}
                value={config.schedule.hour}
                onChange={(e) => updateSchedule('hour', parseInt(e.target.value) || 0)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-minute">Minute</Label>
              <Input
                id="schedule-minute"
                type="number"
                min={0}
                max={59}
                value={config.schedule.minute}
                onChange={(e) => updateSchedule('minute', parseInt(e.target.value) || 0)}
                disabled={isSaving}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-timezone">Timezone</Label>
            <Select
              value={config.schedule.timezone}
              onValueChange={(value) => updateSchedule('timezone', value)}
              disabled={isSaving}
            >
              <SelectTrigger id="schedule-timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="utc-hour" className="flex items-center gap-2">
              UTC Hour (for cron job)
              <Badge variant="secondary" className="text-xs">
                Auto-calculated
              </Badge>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="utc-hour"
                type="number"
                value={config.schedule.utc_hour}
                disabled
                className="bg-muted"
              />
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>
                  {config.schedule.hour.toString().padStart(2, '0')}:
                  {config.schedule.minute.toString().padStart(2, '0')} local ={' '}
                  {config.schedule.utc_hour.toString().padStart(2, '0')}:
                  {config.schedule.minute.toString().padStart(2, '0')} UTC
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Automatically calculated based on hour and timezone. Note: Uses standard time offsets
              (not adjusted for Daylight Saving Time).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Dollar Plan Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Dollar Plan Configuration
          </CardTitle>
          <CardDescription>
            Configure lead allocation for Dollar subscription users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dollar-plan-dollar-leads">Dollar Leads per Day</Label>
              <Input
                id="dollar-plan-dollar-leads"
                type="number"
                min={0}
                max={100}
                value={config.plans['dollar-lead'].dollar_leads}
                onChange={(e) =>
                  updatePlanConfig('dollar-lead', 'dollar_leads', parseInt(e.target.value) || 0)
                }
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dollar-plan-diamond-leads">Diamond Leads per Day</Label>
              <Input
                id="dollar-plan-diamond-leads"
                type="number"
                min={0}
                max={100}
                value={config.plans['dollar-lead'].diamond_leads}
                onChange={(e) =>
                  updatePlanConfig('dollar-lead', 'diamond_leads', parseInt(e.target.value) || 0)
                }
                disabled={isSaving}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="dollar-weekdays-only" className="text-base">
                Weekdays Only
              </Label>
              <p className="text-sm text-muted-foreground">
                Only create claims on Monday through Friday
              </p>
            </div>
            <Switch
              id="dollar-weekdays-only"
              checked={config.plans['dollar-lead'].weekdays_only}
              onCheckedChange={(checked) => updatePlanConfig('dollar-lead', 'weekdays_only', checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Diamond Plan Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gem className="h-5 w-5 text-blue-600" />
            Diamond Plan Configuration
          </CardTitle>
          <CardDescription>
            Configure lead allocation for Diamond subscription users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="diamond-plan-diamond-leads">Diamond Leads per Day</Label>
              <Input
                id="diamond-plan-diamond-leads"
                type="number"
                min={0}
                max={100}
                value={config.plans['diamond-lead'].diamond_leads}
                onChange={(e) =>
                  updatePlanConfig('diamond-lead', 'diamond_leads', parseInt(e.target.value) || 0)
                }
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">Premium/exclusive leads</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diamond-plan-dollar-leads">Dollar Leads per Day</Label>
              <Input
                id="diamond-plan-dollar-leads"
                type="number"
                min={0}
                max={100}
                value={config.plans['diamond-lead'].dollar_leads}
                onChange={(e) =>
                  updatePlanConfig('diamond-lead', 'dollar_leads', parseInt(e.target.value) || 0)
                }
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">Standard pool leads</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="diamond-weekdays-only" className="text-base">
                Weekdays Only
              </Label>
              <p className="text-sm text-muted-foreground">
                Only create claims on Monday through Friday
              </p>
            </div>
            <Switch
              id="diamond-weekdays-only"
              checked={config.plans['diamond-lead'].weekdays_only}
              onCheckedChange={(checked) => updatePlanConfig('diamond-lead', 'weekdays_only', checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Logging Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Logging Options
          </CardTitle>
          <CardDescription>Configure what gets logged during auto-claim execution</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="log-executions" className="text-base">
                Log Executions
              </Label>
              <p className="text-sm text-muted-foreground">
                Log every auto-claim job execution
              </p>
            </div>
            <Switch
              id="log-executions"
              checked={config.logging.log_executions}
              onCheckedChange={(checked) => updateLogging('log_executions', checked)}
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="log-errors" className="text-base">
                Log Errors
              </Label>
              <p className="text-sm text-muted-foreground">
                Log errors during claim processing
              </p>
            </div>
            <Switch
              id="log-errors"
              checked={config.logging.log_errors}
              onCheckedChange={(checked) => updateLogging('log_errors', checked)}
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="log-insufficient-leads" className="text-base">
                Log Insufficient Leads
              </Label>
              <p className="text-sm text-muted-foreground">
                Log when there are not enough leads available
              </p>
            </div>
            <Switch
              id="log-insufficient-leads"
              checked={config.logging.log_insufficient_leads}
              onCheckedChange={(checked) => updateLogging('log_insufficient_leads', checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Manual Run Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="h-5 w-5 text-orange-600" />
            Manual Auto-Claim Trigger
          </CardTitle>
          <CardDescription>
            Manually process missing claims for a specific date. Useful when leads were insufficient
            and you need to fill gaps after uploading more leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manual-run-date">Target Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="manual-run-date"
                  type="date"
                  value={manualRunDate}
                  onChange={(e) => setManualRunDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  disabled={isRunningManual}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Select a date to process missing claims (max 30 days in the past)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Target Users</Label>
              <UserMultiSelect
                selectedUsers={selectedUsers}
                onSelectionChange={setSelectedUsers}
                disabled={isRunningManual}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to process all eligible users, or select specific users
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="default"
                    className="bg-orange-600 hover:bg-orange-700"
                    disabled={isRunningManual || !manualRunDate}
                  >
                    {isRunningManual ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Run Now
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Run Manual Auto-Claim?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div>
                        <p>
                          This will process missing claims for <strong>{manualRunDate}</strong>.
                        </p>
                        {selectedUsers.length > 0 ? (
                          <div className="mt-2 p-2 bg-muted rounded">
                            <p className="font-medium text-sm mb-1">
                              Target Users ({selectedUsers.length}):
                            </p>
                            <ul className="text-xs space-y-1 max-h-24 overflow-y-auto">
                              {selectedUsers.map((user) => (
                                <li key={user.id} className="flex items-center gap-1">
                                  <span className="font-medium">{user.name}</span>
                                  <span className="text-muted-foreground">({user.email})</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="mt-2 text-sm font-medium text-blue-600">
                            All eligible users will be processed.
                          </p>
                        )}
                        <p className="mt-2">The system will:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Check each user&apos;s claims for this date</li>
                          <li>Calculate any shortfall in their lead allocation</li>
                          <li>Create new claims to fill the gaps (if leads are available)</li>
                        </ul>
                        <p className="mt-2 text-amber-600 font-medium">
                          This action will create new claims and assign leads immediately.
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleManualRun}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Run Manual Claim
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </div>

          {/* Results Display */}
          {manualRunResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Last Run Results:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Claims Created:</span>
                  <p className="font-medium text-lg">{manualRunResult.claims_created}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Leads Distributed:</span>
                  <p className="font-medium text-lg">{manualRunResult.leads_distributed}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Users Filled:</span>
                  <p className="font-medium text-lg">{manualRunResult.users_filled}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Errors:</span>
                  <p
                    className={`font-medium text-lg ${manualRunResult.errors > 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {manualRunResult.errors}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isSaving || isResetting}>
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to Defaults
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset to Default Configuration?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all auto-claim settings to their default values. This action cannot
                be undone.
                <br />
                <br />
                Default values:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Dollar Plan: 5 dollar-leads (weekdays only)</li>
                  <li>Diamond Plan: 2 diamond-leads + 10 dollar-leads (daily)</li>
                  <li>Schedule: 8:00 AM EST</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>Reset Configuration</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {hasChanges && (
        <p className="text-sm text-amber-600 text-center">
          You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
        </p>
      )}
    </div>
  );
}
