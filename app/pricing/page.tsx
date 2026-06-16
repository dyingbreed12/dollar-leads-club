import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { PricingPublicClient } from './pricing-public-client';

export const metadata = {
  title: 'Pricing - Dollar Leads',
  description: 'Choose the perfect plan for your lead generation needs',
};

function PricingLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  );
}

export default async function PricingPage() {
  return (
    <div className="min-h-screen bg-cover bg-center bg-[#F0FDF4]" style={{ backgroundImage: 'url(/assets/bg-public.png)' }}>
      <div className="container mx-auto px-4">
        {/* Page Header */}
        <div className="text-center pt-12 pb-5">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get access to qualified motivated seller leads. Start closing more deals today.
          </p>
        </div>

        <Suspense fallback={<PricingLoading />}>
          <PricingPublicClient />
        </Suspense>
      </div>
    </div>
  );
}
