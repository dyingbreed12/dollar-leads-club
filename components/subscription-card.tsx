'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, DollarSign, Settings, Loader2 } from 'lucide-react';
import { openCustomerPortalAction } from '@/actions/subscription.actions';
import { toast } from 'sonner';
import type { UserResponseDTO } from '@/types/user.types';

interface SubscriptionCardProps {
  user: UserResponseDTO;
  planDisplayName: string;
  trialEndDate: string | null;
  subscriptionEndDate: string | null;
  isActive: boolean;
  isTrialing: boolean;
}

export function SubscriptionCard({
  user,
  planDisplayName,
  trialEndDate,
  subscriptionEndDate,
  isActive,
  isTrialing,
}: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      const result = await openCustomerPortalAction();

      if (!result.success) {
        toast.error(result.error || 'Failed to open customer portal');
        return;
      }

      // Redirect to Stripe Customer Portal
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast.error('Failed to open customer portal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Information</CardTitle>
        <CardDescription>Your current plan and subscription status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {user.subscription_plan === 'diamond-lead' ? (
              <Sparkles className="size-5 text-green-600" />
            ) : (
              <DollarSign className="size-5 text-green-600" />
            )}
            <span className="font-medium">Current Plan:</span>
          </div>
          <span className="font-semibold">{planDisplayName}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-medium">Status:</span>
          <Badge
            variant={isActive || isTrialing ? 'default' : 'outline'}
            className={
              isActive
                ? 'bg-green-600'
                : isTrialing
                  ? 'bg-blue-600'
                  : 'bg-gray-400'
            }
          >
            {user.subscription_status || 'Inactive'}
          </Badge>
        </div>

        {isTrialing && trialEndDate && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Trial Ends:</span>
            <span className="text-sm text-muted-foreground">{trialEndDate}</span>
          </div>
        )}

        {subscriptionEndDate && (
          <div className="flex items-center justify-between">
            <span className="font-medium">Current Period Ends:</span>
            <span className="text-sm text-muted-foreground">{subscriptionEndDate}</span>
          </div>
        )}

        {!user.subscription_plan && (
          <p className="text-sm text-muted-foreground">
            No active subscription. Visit the Pricing page to choose a plan.
          </p>
        )}

        {/* Manage Subscription Button - Only show if user has a subscription */}
        {user.subscription_plan && user.stripe_customer_id && (
          <div className="pt-2">
            <Button
              onClick={handleManageSubscription}
              variant="outline"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Settings className="size-4 mr-2" />
                  Manage Subscription
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
