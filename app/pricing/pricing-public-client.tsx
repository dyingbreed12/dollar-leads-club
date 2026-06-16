'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CircleCheck,
  CircleX,
  Phone,
  Flame,
  DollarSign,
  Sparkles,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createPublicCheckoutSessionAction } from '@/actions/public-checkout.actions';

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
    description:
      'Hand-picked, fresher, and higher-quality — the best Dollar Leads with call recordings',
    valuePerLead: '~$50 / lead',
    icon: Sparkles,
    bgColor: 'bg-gradient-to-br from-green-400 to-green-600',
    textColor: 'text-white',
    features: [
      { name: 'Free 56 Hot Leads Included (2 / Every day)', included: true },
      {
        name: 'Free 140 Warm Leads Included (5 / Every day)',
        included: true,
      },
      { name: 'MP3 Call Recordings', included: true },
      { name: 'Priority Support', included: true },
    ],
    totalValue: '~$5,600',
    savings: 'Save $5,000 a month!',
    cta: 'SUBSCRIBE',
    popular: true,
  },
];

export function PricingPublicClient() {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle canceled toast in useEffect to avoid SSR issues
  useEffect(() => {
    const canceled = searchParams.get('canceled');

    if (canceled === 'true') {
      toast.error('Checkout Canceled', {
        description: 'You canceled the checkout process.',
      });
      // Remove query param
      router.replace('/pricing');
    }
  }, [searchParams, router]);

  const handleSubscribe = async (
    priceId: string | undefined,
    planId: string
  ) => {
    if (!priceId) {
      toast.error('Error', {
        description: 'Price ID not configured',
      });
      return;
    }

    setLoading(planId);

    const result = await createPublicCheckoutSessionAction(priceId, planId);

    if (result.success && result.url) {
      window.location.href = result.url;
    } else {
      toast.error('Error', {
        description: result.error || 'Failed to start checkout',
      });
      setLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full py-8">
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {pricingPlans.map((plan) => {
          const BadgeIcon = plan.badgeIcon;
          const PlanIcon = plan.icon;
          const isDiamond = plan.id === 'diamond-lead';

          return (
            <div key={plan.id} className="flex flex-col">
              {/* Header Badge */}
              <div className="flex justify-center mb-4">
                <Badge
                  variant="outline"
                  className="px-4 py-2 gap-2 bg-secondary/10 border-secondary"
                >
                  <BadgeIcon className="size-4" />
                  <span className="font-medium">{plan.badge}</span>
                </Badge>
              </div>

              {/* Plan Title */}
              <div className="text-center mb-2">
                <h2 className="text-3xl font-bold">
                  {plan.name.replace(' (DLC)', '').replace(' (DLC+)', '')}
                </h2>
              </div>

              {/* Description */}
              <div className="text-center mb-5 min-h-[60px]">
                <p className="text-muted-foreground text-sm">
                  {plan.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Real World Value: {plan.valuePerLead}
                </p>
              </div>

              {/* Pricing Card */}
              <div
                className={`relative rounded-2xl ${plan.bgColor} p-8 flex-1 border-2 ${
                  isDiamond ? 'border-green-500' : ''
                }`}
              >
                {/* Most Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 -right-3 bg-red-600 text-white px-6 py-2 rounded-lg transform rotate-3 shadow-lg">
                    <span className="font-bold text-sm">MOST POPULAR</span>
                  </div>
                )}

                {/* Plan Icon */}
                <div className="mb-6">
                  <PlanIcon
                    className={`size-12 ${
                      isDiamond ? 'text-white' : 'text-green-600'
                    }`}
                  />
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
                        <CircleCheck
                          className={`size-5 shrink-0 mt-0.5 ${
                            isDiamond ? 'text-white' : 'text-green-600'
                          }`}
                        />
                      ) : (
                        <CircleX
                          className={`size-5 shrink-0 mt-0.5 ${
                            isDiamond ? 'text-white/60' : 'text-red-500'
                          }`}
                        />
                      )}
                      <span
                        className={`text-sm ${
                          feature.included
                            ? plan.textColor
                            : isDiamond
                              ? 'text-white/60'
                              : 'text-gray-400'
                        }`}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className="w-full bg-primary hover:bg-secondary text-white font-semibold py-6 mb-4"
                  onClick={() => handleSubscribe(plan.price_id, plan.id)}
                  disabled={loading === plan.id}
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {plan.cta} <ChevronRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>

                {/* Total Value */}
                <div className={`text-center mb-3 ${plan.textColor}`}>
                  <p className="text-sm">
                    Total Real World Value:{' '}
                    <span className="font-semibold">{plan.totalValue}</span>
                  </p>
                </div>

                {/* Savings Badge */}
                <div className="flex justify-center">
                  <Badge
                    className={`${
                      isDiamond
                        ? 'bg-white text-green-600'
                        : 'bg-green-600 text-white'
                    } px-6 py-2 text-sm font-semibold`}
                  >
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
      <div className="text-center mt-12">
        <h2 className="text-2xl font-bold mb-2">
        ⚠️ High Demand Notice
        </h2>
        <p className="text-md text-gray-900">
        Due to overwhelming demand, current onboarding time is 5–7 business days before your leads begin delivering. <br />
        Don’t worry, your next billing doesn’t hit until 30 days after you start receiving leads. But hurry, sign up to secure your spot and activate your membership.
        </p>
      </div>
    </div>
  );
}
