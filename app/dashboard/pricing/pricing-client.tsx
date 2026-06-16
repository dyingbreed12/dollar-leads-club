'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircleCheck, CircleX, Phone, Flame, DollarSign, Sparkles, ChevronRight, Loader2, CheckCircle2, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTimezone } from '@/hooks/use-timezone';
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
import { toast } from 'sonner';
import {
  createCheckoutSessionAction,
  upgradeSubscriptionAction,
  downgradeSubscriptionAction,
  cancelSubscriptionAction,
  resumeSubscriptionAction,
} from '@/actions/subscription.actions';
import { WaitingListDialog } from '@/components/dashboard/waiting-list-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const pricingPlans = [
  {
    id: 'dollar-lead',
    name: 'Dollar Lead Club (DLC)',
    price_id: process.env.NEXT_PUBLIC_STRIPE_DOLLAR_LEAD_PLAN,
    price: 99,
    badge: 'Qualified Warm Leads',
    badgeIcon: Phone,
    description: 'Qualified Motivated Seller Leads',
    valuePerLead: '~$10 / lead',
    icon: DollarSign,
    bgColor: 'bg-green-50 border-green-200',
    textColor: 'text-gray-900',
    features: [
      { name: 'Free 100 Warm Leads Included (5 / Weekday)', included: true },
      { name: "Hot 'Diamond Leads'", included: false },
      { name: 'MP3 Call Recordings', included: false },
      { name: 'Priority Support', included: false },
    ],
    totalValue: '~$1,000',
    savings: 'Save $900 a month!',
    cta: 'SUBSCRIBE',
    popular: false,
  },
  {
    id: 'diamond-lead',
    name: 'Diamond Lead Club (DLC+)',
    price_id: process.env.NEXT_PUBLIC_STRIPE_DIAMOND_LEAD_PLAN,
    price: 499,
    badge: 'Hot Leads',
    badgeIcon: Flame,
    description: 'Hand-picked, fresher, and higher-quality — the best Dollar Leads with call recordings',
    valuePerLead: '~$50 / lead',
    icon: Sparkles,
    bgColor: 'bg-gradient-to-br from-green-400 to-green-600',
    textColor: 'text-white',
    features: [
      { name: 'Free 56 Hot Leads Included (2 / Every day)', included: true },
      { name: "Free 140 Warm Leads Included (5 / Every day)", included: true },
      { name: 'MP3 Call Recordings', included: true },
      { name: "Priority Support", included: true },

    ],
    totalValue: '~$5,600',
    savings: 'Save $5,000 a month!',
    cta: 'SUBSCRIBE',
    popular: true,
  },
];

interface PricingClientProps {
  userSubscription: {
    plan: string | null;
    status: string | null;
    currentPeriodEnd: string | null;
    stripeCustomerId: string | null;
  };
}

export function PricingClient({ userSubscription }: PricingClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [downgradeDialogOpen, setDowngradeDialogOpen] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [soldOutDialogOpen, setSoldOutDialogOpen] = useState(false);
  const [waitingListDialogOpen, setWaitingListDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<typeof pricingPlans[0] | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sold out feature toggle
  const isSoldOut = process.env.NEXT_PUBLIC_IS_SOLD_OUT === 'true';

  // Use timezone hook for date formatting
  const { formatDate } = useTimezone();

  // Handle success/canceled toasts in useEffect to avoid SSR issues
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast.success('Success!', {
        description: 'Your subscription is now active. Welcome to Dollar Leads!',
      });
      // Remove query param
      router.replace('/dashboard/pricing');
    } else if (canceled === 'true') {
      toast.error('Checkout Canceled', {
        description: 'You canceled the checkout process.',
      });
      // Remove query param
      router.replace('/dashboard/pricing');
    }
  }, [searchParams, router]);

// Show waiting list dialog on page load when sold out
useEffect(() => {
    const hasActiveSubscription = userSubscription.status === 'active';
    const hasSeenWaitingList = localStorage.getItem('hasSeenWaitingList') === 'true';

    // Override flag - use URL query parameter: ?showWaitingList=true
    const alwaysShow = searchParams.get('showWaitingList') === 'true';

    // Show waiting list dialog if:
    // 1. Override is enabled (always show), OR
    // 2. Sold out AND no active subscription AND hasn't seen it before
    if (alwaysShow || (isSoldOut && !hasActiveSubscription && !hasSeenWaitingList)) {
      setWaitingListDialogOpen(true);

      // Mark as seen (unless override is enabled)
      if (!alwaysShow) {
        localStorage.setItem('hasSeenWaitingList', 'true');
      }
    }
}, [isSoldOut, userSubscription.status, searchParams]);

  const handleSubscribe = async (priceId: string | undefined, planId: string) => {
    if (!priceId) {
      toast.error('Error', {
        description: 'Price ID not configured',
      });
      return;
    }

    setLoading(planId);

    const result = await createCheckoutSessionAction(priceId, planId);

    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      toast.error('Error', {
        description: result.error || 'Failed to start checkout',
      });
      setLoading(null);
    }
  };

  const handleUpgrade = async (priceId: string | undefined, planId: string) => {
    if (!priceId) {
      toast.error('Error', {
        description: 'Price ID not configured',
      });
      return;
    }

    setLoading(planId);

    const result = await upgradeSubscriptionAction(priceId, planId);

    if (result.success) {
      toast.success('Success!', {
        description: result.message || 'Your subscription has been upgraded!',
      });
      router.refresh();
    } else {
      toast.error('Error', {
        description: result.error || 'Failed to upgrade subscription',
      });
    }

    setLoading(null);
  };

  const handleDowngrade = async (priceId: string | undefined, planId: string) => {
    if (!priceId) {
      toast.error('Error', {
        description: 'Price ID not configured',
      });
      return;
    }

    setLoading(planId);

    const result = await downgradeSubscriptionAction(priceId, planId);

    if (result.success) {
      toast.success('Downgrade Scheduled', {
        description: result.message || 'Your plan will change at the end of your billing period.',
      });
      router.refresh();
    } else {
      toast.error('Error', {
        description: result.error || 'Failed to downgrade subscription',
      });
    }

    setLoading(null);
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You\'ll have access until the end of your billing period.')) {
      return;
    }

    setLoading('cancel');

    const result = await cancelSubscriptionAction();

    if (result.success) {
      toast.success('Subscription Canceled', {
        description: result.message,
      });
      router.refresh();
    } else {
      toast.error('Error', {
        description: result.error || 'Failed to cancel subscription',
      });
    }

    setLoading(null);
  };

  const handleResumeSubscription = async () => {
    setLoading('resume');

    const result = await resumeSubscriptionAction();

    if (result.success) {
      toast.success('Subscription Resumed', {
        description: result.message,
      });
      router.refresh();
    } else {
      toast.error('Error', {
        description: result.error || 'Failed to resume subscription',
      });
    }

    setLoading(null);
  };

  const isCurrentPlan = (planId: string) => userSubscription.plan === planId;
  const hasActiveSubscription = userSubscription.status === 'active';
  const getPlanValue = (planId: string) => pricingPlans.find(p => p.id === planId)?.price || 0;
  const getCurrentPlan = () => pricingPlans.find(p => p.id === userSubscription.plan);
  const isUpgrade = (planId: string) => {
    if (!userSubscription.plan) return false;
    return getPlanValue(planId) > getPlanValue(userSubscription.plan);
  };
  const isDowngrade = (planId: string) => {
    if (!userSubscription.plan) return false;
    return getPlanValue(planId) < getPlanValue(userSubscription.plan);
  };

  // Open confirmation dialogs
  const openUpgradeDialog = (plan: typeof pricingPlans[0]) => {
    setSelectedPlan(plan);
    setUpgradeDialogOpen(true);
  };

  const openDowngradeDialog = (plan: typeof pricingPlans[0]) => {
    // Block Diamond → Dollar Lead downgrade - require support contact
    if (userSubscription.plan === 'diamond-lead' && plan.id === 'dollar-lead') {
      setSelectedPlan(plan);
      setSupportDialogOpen(true);
      return;
    }

    setSelectedPlan(plan);
    setDowngradeDialogOpen(true);
  };

  // Confirm upgrade
  const confirmUpgrade = async () => {
    if (!selectedPlan) return;
    setUpgradeDialogOpen(false);
    await handleUpgrade(selectedPlan.price_id, selectedPlan.id);
  };

  // Confirm downgrade
  const confirmDowngrade = async () => {
    if (!selectedPlan) return;
    setDowngradeDialogOpen(false);
    await handleDowngrade(selectedPlan.price_id, selectedPlan.id);
  };

  return (
    <div className="max-w-6xl mx-auto w-full py-8">
      {/* 7-Day Money-Back Guarantee Banner */}
      {/* <Alert className="bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 border-green-500 text-white mb-4 flex items-center gap-4">
        <div>
          <ShieldCheck className="size-14" />
        </div>
       <div>
          <AlertTitle className="text-xl font-bold">
            7 Day Money Back Guarantee
          </AlertTitle>
          <AlertDescription className="text-white text-base ">
            Not satisfied? Get a full refund within 7 days.
            No questions asked, no hassle. Your investment is completely risk-free.
            Contact us at <a href="mailto:support@dollarleads.com" className="underline font-semibold">support@dollarleads.com</a>
          </AlertDescription>
       </div>
      </Alert> */}
      {/* Subscription Status Banner */}
      {userSubscription.status && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div>
            <h3 className="font-semibold text-green-900">
              Current Plan: {pricingPlans.find(p => p.id === userSubscription.plan)?.name || 'Unknown'}
            </h3>
            <p className="text-sm text-green-700">
              Status: {userSubscription.status}
              {userSubscription.currentPeriodEnd && ` • Renews on ${formatDate(new Date(userSubscription.currentPeriodEnd))}`}
            </p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {pricingPlans.map((plan) => {
          const BadgeIcon = plan.badgeIcon;
          const PlanIcon = plan.icon;
          const isDiamond = plan.id === 'diamond-lead';
          const isCurrent = isCurrentPlan(plan.id);

          let buttonText = plan.cta;
          let buttonAction: () => void | Promise<void> = () => handleSubscribe(plan.price_id, plan.id);
          let buttonDisabled = false;
          let buttonVariant: 'default' | 'outline' | 'secondary' = 'default';

          // Override for sold out (highest priority) - Only affects non-subscribed users
          if (isSoldOut && !hasActiveSubscription) {
            buttonAction = () => setSoldOutDialogOpen(true);
          }

          if (isCurrent) {
            buttonText = 'CURRENT PLAN';
            buttonDisabled = true;
            buttonVariant = 'secondary';
          } else if (hasActiveSubscription) {
            if (isUpgrade(plan.id)) {
              buttonText = 'UPGRADE NOW';
              buttonAction = () => openUpgradeDialog(plan);
            } else if (isDowngrade(plan.id)) {
              buttonText = 'DOWNGRADE';
              buttonAction = () => openDowngradeDialog(plan);
              buttonVariant = 'outline';
            }
          }

          return (
            <div key={plan.id} className="flex flex-col">
              {/* Header Badge */}
              <div className="flex justify-center mb-4">
                <Badge variant="outline" className="px-4 py-2 gap-2 bg-secondary/10 border-secondary">
                  <BadgeIcon className="size-4" />
                  <span className="font-medium">{plan.badge}</span>
                </Badge>
              </div>

              {/* Plan Title */}
              <div className="text-center mb-2">
                <h2 className="text-3xl font-bold">{plan.name.replace(' (DLC)', '').replace(' (DLC+)', '')}</h2>
              </div>

              {/* Description */}
              <div className="text-center mb-5 min-h-[60px]">
                <p className="text-muted-foreground text-sm">{plan.description}</p>
                <p className="text-xs text-muted-foreground mt-1">Real World Value: {plan.valuePerLead}</p>
              </div>

              {/* Pricing Card */}
              <div className={`relative rounded-2xl ${plan.bgColor} p-8 flex-1 border-2 ${isDiamond ? 'border-green-500' : ''}`}>
                {/* Sold Out Badge - Only show if IS_SOLD_OUT=true AND user is NOT subscribed */}
                {isSoldOut && !hasActiveSubscription && (
                  <div className="absolute -top-3 -right-3 bg-red-600 text-white px-6 py-2 rounded-lg transform rotate-3 shadow-lg z-10">
                    <span className="font-bold text-sm">SOLD OUT</span>
                  </div>
                )}

                {/* Most Popular Badge - Hide when sold out to avoid overlap */}
                {plan.popular && (!isSoldOut || hasActiveSubscription) && (
                  <div className="absolute -top-3 -right-3 bg-red-600 text-white px-6 py-2 rounded-lg transform rotate-3 shadow-lg">
                    <span className="font-bold text-sm">MOST POPULAR</span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrent && (
                  <div className="absolute -top-3 -left-3 bg-green-600 text-white px-6 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <CheckCircle2 className="size-4" />
                    <span className="font-bold text-sm">CURRENT PLAN</span>
                  </div>
                )}

                {/* Plan Icon */}
                <div className="mb-6">
                  <PlanIcon className={`size-12 ${isDiamond ? 'text-white' : 'text-green-600'}`} />
                </div>

                {/* Plan Name */}
                <h3 className={`text-2xl font-bold mb-2 ${plan.textColor}`}>
                  {plan.name}
                </h3>

                {/* Price */}
                <div className={`mb-6 ${plan.textColor}`}>
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-lg"> / month</span>
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      {feature.included ? (
                        <CircleCheck className={`size-5 shrink-0 mt-0.5 ${isDiamond ? 'text-white' : 'text-green-600'}`} />
                      ) : (
                        <CircleX className={`size-5 shrink-0 mt-0.5 ${isDiamond ? 'text-white/60' : 'text-red-500'}`} />
                      )}
                      <span
                        className={`text-sm ${
                          feature.included
                            ? plan.textColor
                            : isDiamond ? 'text-white/60' : 'text-gray-400'
                        }`}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className={`w-full ${buttonVariant === 'default' ? 'bg-primary hover:bg-secondary text-white' : ''} font-semibold py-6 mb-4`}
                  variant={buttonVariant}
                  onClick={buttonAction}
                  disabled={buttonDisabled || loading === plan.id}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {buttonText} <ChevronRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>

                {/* Total Value */}
                <div className={`text-center mb-3 ${plan.textColor}`}>
                  <p className="text-sm">Total Real World Value: <span className="font-semibold">{plan.totalValue}</span></p>
                </div>

                {/* Savings Badge */}
                <div className="flex justify-center">
                  <Badge className={`${isDiamond ? 'bg-white text-green-600' : 'bg-green-600 text-white'} px-6 py-2 text-sm font-semibold`}>
                    <DollarSign className="size-4 mr-1" />
                    {plan.savings}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Message */}

      {isSoldOut && !hasActiveSubscription && (
        <div className="text-center mt-12">
          <h2 className="text-2xl font-bold mb-2">
          🚨 SOLD OUT NOTICE!
          </h2>
          <p className="text-md text-gray-900">
          Due to overwhelming demand, V1 Nationwide Leads are officially sold out. <br />
          Join the waitlist soon to secure early access to V2 Market-Specific Leads.
          </p>
        </div>
      )}

      {/* Upgrade Confirmation Dialog */}
      <AlertDialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
                <TrendingUp className="size-6 text-green-600" />
              </div>
              <AlertDialogTitle className="text-2xl">
                Upgrade to {selectedPlan?.name}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base space-y-4">
              {/* Plan Comparison */}
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Current Plan</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {getCurrentPlan()?.name} - ${getCurrentPlan()?.price}/month
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">New Plan</p>
                    <p className="text-lg font-semibold text-green-600">
                      {selectedPlan?.name} - ${selectedPlan?.price}/month
                    </p>
                  </div>
                </div>
              </div>

              {/* What You're Getting */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="size-4 text-green-600" />
                  What you're getting:
                </h4>
                <ul className="space-y-2 pl-6">
                  {selectedPlan?.features
                    .filter(f => f.included)
                    .slice(0, 5)
                    .map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CircleCheck className="size-4 shrink-0 text-green-600 mt-0.5" />
                        <span className="text-gray-700">{feature.name}</span>
                      </li>
                    ))}
                </ul>
              </div>

              {/* Billing Information */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-green-900 flex items-center gap-2">
                  <DollarSign className="size-4" />
                  Billing Details:
                </h4>
                <ul className="space-y-1 text-sm text-green-800">
                  <li>• Immediate access to all premium features</li>
                  <li>
                    • You'll be charged a prorated amount today (${
                      selectedPlan ? selectedPlan.price - (getCurrentPlan()?.price || 0) : 0
                    } difference)
                  </li>
                  <li>
                    • Next billing: ${selectedPlan?.price}/month on{' '}
                    {userSubscription.currentPeriodEnd
                      ? formatDate(new Date(userSubscription.currentPeriodEnd))
                      : 'next billing date'}
                  </li>
                </ul>
              </div>

              {/* Value Proposition */}
              <div className="text-center p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
                <p className="text-sm font-semibold text-green-900">
                  {selectedPlan?.savings} • Real World Value: {selectedPlan?.totalValue}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUpgrade}
              className="bg-green-600 hover:bg-green-700"
            >
              <TrendingUp className="size-4 mr-2" />
              Upgrade Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Downgrade Confirmation Dialog */}
      <AlertDialog open={downgradeDialogOpen} onOpenChange={setDowngradeDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-12 items-center justify-center rounded-full bg-orange-100">
                <TrendingDown className="size-6 text-orange-600" />
              </div>
              <AlertDialogTitle className="text-2xl">
                Downgrade to {selectedPlan?.name}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base space-y-4">
              {/* Plan Comparison */}
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Current Plan</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {getCurrentPlan()?.name} - ${getCurrentPlan()?.price}/month
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">New Plan</p>
                    <p className="text-lg font-semibold text-orange-600">
                      {selectedPlan?.name} - ${selectedPlan?.price}/month
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning about feature loss */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-orange-900 flex items-center gap-2">
                  <AlertTriangle className="size-4" />
                  Features you'll lose:
                </h4>
                <ul className="space-y-1 text-sm text-orange-800">
                  {getCurrentPlan()?.features
                    .filter(f => f.included && !selectedPlan?.features.find(sf => sf.name === f.name && sf.included))
                    .slice(0, 5)
                    .map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CircleX className="size-4 shrink-0 text-orange-600 mt-0.5" />
                        <span>{feature.name}</span>
                      </li>
                    ))}
                </ul>
              </div>

              {/* Billing Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                  <DollarSign className="size-4" />
                  Billing Details:
                </h4>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• Change takes effect at the end of your billing period</li>
                  <li>
                    • You'll keep all current features until{' '}
                    {userSubscription.currentPeriodEnd
                      ? formatDate(new Date(userSubscription.currentPeriodEnd))
                      : 'the end of your billing period'}
                  </li>
                  <li>
                    • New plan starts on{' '}
                    {userSubscription.currentPeriodEnd
                      ? formatDate(new Date(userSubscription.currentPeriodEnd))
                      : 'next billing date'}{' '}
                    at ${selectedPlan?.price}/month
                  </li>
                  <li>• No refund - remaining balance credits to next billing cycle</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDowngrade}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <TrendingDown className="size-4 mr-2" />
              Schedule Downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Support Contact Dialog (for Diamond → Dollar Lead downgrades) */}
      <AlertDialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-12 items-center justify-center rounded-full bg-yellow-100">
                <AlertTriangle className="size-6 text-yellow-600" />
              </div>
              <AlertDialogTitle className="text-2xl">
                Contact Support Required
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base space-y-4">
              <p className="text-gray-700">
                Downgrading from <span className="font-semibold">Diamond Lead Club</span> to{' '}
                <span className="font-semibold">Dollar Lead Club</span> requires assistance from our support team.
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-yellow-900">
                  To request a downgrade:
                </h4>
                <div className="space-y-2 text-sm text-yellow-800">
                  <p>Please send an email to our support team with your downgrade request:</p>
                  <a
                    href="mailto:support@dollarleads.com?subject=Downgrade Request - Diamond to Dollar Lead"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                  >
                    📧 support@dollarleads.com
                  </a>
                  <p className="text-xs text-yellow-600 mt-2">
                    Our team will process your request and ensure a smooth transition to the Dollar Lead plan.
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p>
                  <strong>Note:</strong> You'll continue to have full access to Diamond features until the change is processed.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sold Out Dialog */}
      <AlertDialog open={soldOutDialogOpen} onOpenChange={setSoldOutDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex size-12 items-center justify-center rounded-full bg-red-100">
                <Flame className="size-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-2xl">
                Sold Out!
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base space-y-4">
              {/* Main Message */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-lg font-semibold text-red-900">
                  V1 Nationwide Leads are officially SOLD OUT!
                </p>
                <p className="text-lg font-semibold text-red-800 mt-2">
                  🔥 V2 Instant Market-Specific Leads dropping soon!
                </p>
              </div>

              {/* Image */}
              <div className="flex justify-center mt-10">
                <img
                  src="https://dollarleads.com/wp-content/uploads/2025/11/sold-out.webp"
                  alt="Sold Out"
                  className="w-[70%] max-w-md rounded-lg shadow-md"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Waiting List Dialog */}
      <WaitingListDialog
        isOpen={waitingListDialogOpen}
        onClose={() => setWaitingListDialogOpen(false)}
      />
    </div>
  );
}