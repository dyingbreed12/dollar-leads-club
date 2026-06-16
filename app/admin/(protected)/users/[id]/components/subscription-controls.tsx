'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { TrendingUp, TrendingDown, Loader2, AlertTriangle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { adminUpdateSubscriptionAction } from '@/actions/admin.actions';
import { useRouter } from 'next/navigation';

interface SubscriptionControlsProps {
  userId: string;
  currentPlan: 'dollar-lead' | 'diamond-lead';
}

const PLANS = {
  'dollar-lead': {
    name: 'Dollar Lead Club',
    price: 99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_DOLLAR_LEAD_PLAN,
  },
  'diamond-lead': {
    name: 'Diamond Lead Club',
    price: 499,
    priceId: process.env.NEXT_PUBLIC_STRIPE_DIAMOND_LEAD_PLAN,
  },
} as const;

export function SubscriptionControls({ userId, currentPlan }: SubscriptionControlsProps) {
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'dollar-lead' | 'diamond-lead' | null>(null);
  const router = useRouter();

  const targetPlan = currentPlan === 'dollar-lead' ? 'diamond-lead' : 'dollar-lead';
  const isUpgrade = targetPlan === 'diamond-lead';

  const openConfirmDialog = (plan: 'dollar-lead' | 'diamond-lead') => {
    setSelectedPlan(plan);
    setDialogOpen(true);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedPlan) return;

    const priceId = PLANS[selectedPlan].priceId;
    if (!priceId) {
      toast.error('Error', {
        description: 'Price ID not configured for this plan',
      });
      return;
    }

    setLoading(true);
    setDialogOpen(false);

    try {
      const result = await adminUpdateSubscriptionAction(userId, selectedPlan, priceId);

      if (result.success) {
        toast.success('Success!', {
          description: result.message || 'Subscription updated successfully',
        });
        router.refresh();
      } else {
        toast.error('Error', {
          description: result.error || 'Failed to update subscription',
        });
      }
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <>
      <div className="flex gap-3">
        {isUpgrade ? (
          <Button
            onClick={() => openConfirmDialog('diamond-lead')}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <TrendingUp className="size-4 mr-2" />
                Upgrade to Diamond
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => openConfirmDialog('dollar-lead')}
            disabled={loading}
            variant="outline"
            className="border-orange-600 text-orange-600 hover:bg-orange-50"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <TrendingDown className="size-4 mr-2" />
                Downgrade to Dollar
              </>
            )}
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`flex size-12 items-center justify-center rounded-full ${
                isUpgrade ? 'bg-green-100' : 'bg-orange-100'
              }`}>
                {isUpgrade ? (
                  <TrendingUp className="size-6 text-green-600" />
                ) : (
                  <TrendingDown className="size-6 text-orange-600" />
                )}
              </div>
              <AlertDialogTitle className="text-2xl">
                {isUpgrade ? 'Upgrade' : 'Downgrade'} User Subscription
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base space-y-4">
              <p className="text-gray-700">
                You are about to {isUpgrade ? 'upgrade' : 'downgrade'} this user's subscription:
              </p>

              {/* Plan Comparison */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Current Plan:</span>
                    <span className="font-semibold text-gray-900">
                      {PLANS[currentPlan].name} - ${PLANS[currentPlan].price}/month
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">New Plan:</span>
                    <span className={`font-semibold ${isUpgrade ? 'text-green-600' : 'text-orange-600'}`}>
                      {selectedPlan && PLANS[selectedPlan].name} - ${selectedPlan && PLANS[selectedPlan].price}/month
                    </span>
                  </div>
                </div>
              </div>

              {/* Billing Information */}
              <div className={`${isUpgrade ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} border rounded-lg p-4 space-y-2`}>
                <h4 className={`font-semibold flex items-center gap-2 ${isUpgrade ? 'text-green-900' : 'text-orange-900'}`}>
                  <DollarSign className="size-4" />
                  Billing Details:
                </h4>
                <ul className={`space-y-1 text-sm ${isUpgrade ? 'text-green-800' : 'text-orange-800'}`}>
                  <li>• Change takes effect immediately</li>
                  <li>• User will be charged/credited prorated amount</li>
                  {isUpgrade ? (
                    <li>• Immediate access to all premium features</li>
                  ) : (
                    <li>• Premium features will be removed immediately</li>
                  )}
                  <li>• Next billing: ${selectedPlan && PLANS[selectedPlan].price}/month</li>
                </ul>
              </div>

              {!isUpgrade && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="size-4 text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> Downgrading will immediately remove Diamond features including
                    call recordings and additional daily leads.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateSubscription}
              className={isUpgrade ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
            >
              {isUpgrade ? (
                <>
                  <TrendingUp className="size-4 mr-2" />
                  Confirm Upgrade
                </>
              ) : (
                <>
                  <TrendingDown className="size-4 mr-2" />
                  Confirm Downgrade
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
