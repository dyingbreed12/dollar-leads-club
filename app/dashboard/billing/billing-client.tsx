'use client';

import { useState, useEffect } from 'react';
import { PaymentMethodCard } from '@/components/billing/payment-method-card';
import { UpdatePaymentForm } from '@/components/billing/update-payment-form';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTimezone } from '@/hooks/use-timezone';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, CreditCard, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import {
  cancelSubscriptionAction,
  resumeSubscriptionAction,
  createSetupIntentAction,
  getPaymentMethodAction,
} from '@/actions/subscription.actions';

interface BillingClientProps {
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
}

/**
 * BillingClient Component
 *
 * Client-side billing management interface
 * Handles:
 * - Display and update payment method
 * - Cancel/Resume subscription
 * - Subscription status display
 */
export function BillingClient({ subscription }: BillingClientProps) {
  const [paymentMethod, setPaymentMethod] = useState<any>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(true);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  // Load payment method on mount
  useEffect(() => {
    loadPaymentMethod();
  }, []);

  const loadPaymentMethod = async () => {
    setIsLoadingPayment(true);
    setError(null);
    try {
      const result = await getPaymentMethodAction();
      if (result.success) {
        setPaymentMethod(result.paymentMethod);
      } else {
        // Show error if the action failed
        console.error('Failed to load payment method:', result.error);
        setError(result.error || 'Failed to load payment method');
      }
    } catch (err) {
      console.error('Failed to load payment method:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payment method');
    } finally {
      setIsLoadingPayment(false);
    }
  };

  const handleUpdatePaymentClick = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      // Create SetupIntent
      const result = await createSetupIntentAction();

      if (!result.success || !result.clientSecret) {
        setError(result.error || 'Failed to initialize payment form');
        setIsProcessing(false);
        return;
      }

      setClientSecret(result.clientSecret);
      setShowUpdateForm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentUpdateSuccess = () => {
    setShowUpdateForm(false);
    setClientSecret(null);
    setSuccess('Payment method updated successfully!');
    loadPaymentMethod();
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleCancelSubscription = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      const result = await cancelSubscriptionAction();

      if (!result.success) {
        setError(result.error || 'Failed to cancel subscription');
        setIsProcessing(false);
        return;
      }

      setSuccess(result.message || 'Subscription canceled successfully');
      setShowCancelDialog(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  const handleResumeSubscription = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      const result = await resumeSubscriptionAction();

      if (!result.success) {
        setError(result.error || 'Failed to resume subscription');
        setIsProcessing(false);
        return;
      }

      setSuccess(result.message || 'Subscription resumed successfully');
      setShowResumeDialog(false);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  // Use timezone hook for date formatting
  const { formatDateLong, loading: timezoneLoading } = useTimezone();

  // Format plan name for display
  const formatPlanName = (plan: string): string => {
    const planMap: Record<string, string> = {
      'dollar-lead': 'Dollar Lead',
      'diamond-lead': 'Diamond Lead',
    };
    return planMap[plan] || plan;
  };

  // Format date using configured timezone
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    return formatDateLong(new Date(dateString));
  };

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-900">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Subscription Status Card */}
      {subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Subscription Status</CardTitle>
            <CardDescription>
              Manage your subscription and billing settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Current Plan
                </p>
                <p className="text-lg font-semibold">
                  {formatPlanName(subscription.plan)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      subscription.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : subscription.status === 'canceled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {subscription.status.charAt(0).toUpperCase() +
                      subscription.status.slice(1)}
                  </span>
                  {subscription.cancelAtPeriodEnd && (
                    <span className="text-xs text-muted-foreground">
                      (Ends {formatDate(subscription.currentPeriodEnd)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {subscription.currentPeriodEnd && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {subscription.cancelAtPeriodEnd
                    ? 'Access Until'
                    : 'Next Billing Date'}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatDate(subscription.currentPeriodEnd)}
                </div>
              </div>
            )}

            {/* Subscription Actions */}
            <div className="flex gap-3 pt-4">
              {subscription.cancelAtPeriodEnd ? (
                <Button
                  onClick={() => setShowResumeDialog(true)}
                  disabled={isProcessing}
                  variant="default"
                >
                  Resume Subscription
                </Button>
              ) : (
                <Button
                  onClick={() => setShowCancelDialog(true)}
                  disabled={isProcessing}
                  variant="destructive"
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Method Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
          <CardDescription>
            Update your payment method for future billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPayment ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : showUpdateForm && clientSecret ? (
            <UpdatePaymentForm
              clientSecret={clientSecret}
              onSuccess={handlePaymentUpdateSuccess}
              onCancel={() => {
                setShowUpdateForm(false);
                setClientSecret(null);
              }}
            />
          ) : (
            <PaymentMethodCard
              paymentMethod={paymentMethod}
              onUpdateClick={handleUpdatePaymentClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will remain active until the end of your current
              billing period ({formatDate(subscription?.currentPeriodEnd || null)}).
              After that, you'll lose access to premium features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Canceling...
                </>
              ) : (
                'Cancel Subscription'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resume Subscription Dialog */}
      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume Subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your subscription will continue and you'll be billed automatically at
              the end of your current period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResumeSubscription}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resuming...
                </>
              ) : (
                'Resume Subscription'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
