'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Clock, Link, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { LeadClaimPanel } from '@/components/dashboard/lead-claim-panel';
import { FullCountdownTimer } from '@/components/dashboard/full-countdown-timer';
import { OnboardingDialog } from '@/components/dashboard/onboarding-dialog';
import type { LeadsStartInfo } from '@/utils/customs/leadsStartDate';
import { MarketingDialog } from '@/components/dashboard/marketing-dialog';
import { Button } from '@/components/ui/button';

interface DashboardClientProps {
  userSubscriptionPlan: string | null;
  leadAccess: boolean;
  countdownInfo: LeadsStartInfo;
  userRole: string | null;
}

export function DashboardClient({ userSubscriptionPlan, leadAccess, countdownInfo, userRole }: DashboardClientProps) {
  // Feature flag to disable onboarding dialog
  const ENABLE_ONBOARDING_DIALOG = false;

  // Track if user has manually dismissed the dialog in this session
  const [userDismissed, setUserDismissed] = useState(false);

  // Track Marketing dialog - set to true to show on mount
  const [showMarketingDialog, setShowMarketingDialog] = useState(true);

  // Check localStorage once - lazy initialization pattern
  const [wasPreviouslyDismissed] = useState(() => {
    // Only run on client-side (not during SSR)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('onboarding-dismissed') === 'true';
    }
    return false;
  });

  // Calculate if dialog should be open (derived from props and state)
  const dialogOpen = countdownInfo.showCountdown && !userDismissed && !wasPreviouslyDismissed;

  // Handle onboarding dialog dismissal
  const handleDismissOnboarding = () => {
    // Store dismissal in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding-dismissed', 'true');
    }

    // Mark as dismissed in this session
    setUserDismissed(true);
  };

  return (
    <>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* First Card - Conditionally render countdown or DLC info */}
        {countdownInfo.showCountdown && countdownInfo.targetDate ? (
          <FullCountdownTimer targetDate={countdownInfo.targetDate} />
        ) : (
          <Card
            className="bg-secondary border-primary"
            style={{
              backgroundImage: 'url(/assets/about-shape-1.png)',
              backgroundPosition: 'bottom left',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <CardContent className="text-left mx-auto space-y-5 flex items-center justify-center h-full">
              <div className="flex flex-col 2xl:flex-row items-center justify-center gap-4 h-full">
                <Image className='hidden xl:block'  src="/mining.webp" alt="Logo" width={200} height={100} />
                <div>
                  <h2 className="text-4xl font-bold">DLC</h2>
                  <p className="text-lg text-muted-foreground font-medium">
                    Get exclusive motivated seller leads delivered to you daily for one low monthly
                    price.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* YouTube Video Card */}
        <div className="rounded-xl overflow-hidden border border-primary">
          <div className="relative w-full h-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src="https://drive.google.com/file/d/1PGyVz-8Yoo8zQEd-GSLlfCjFgGuRREk8/preview"
              title="Video player"
              frameBorder="0"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        {/* MaxDispo Card */}
        <div
          className="relative overflow-hidden rounded-lg"
          style={{
            backgroundColor: '#1a1a1a',
            backgroundImage: `
              radial-gradient(ellipse at top left, rgba(0, 0, 0, 0.8), transparent 40%),
              radial-gradient(ellipse at top right, rgba(40, 40, 40, 0.6), transparent 40%),
              radial-gradient(ellipse at bottom left, rgba(20, 20, 20, 0.7), transparent 40%),
              radial-gradient(ellipse at bottom right, rgba(30, 30, 30, 0.5), transparent 40%),
              linear-gradient(180deg, rgba(0, 0, 0, 0.9) 0%, rgba(40, 40, 40, 0.7) 50%, rgba(0, 0, 0, 0.9) 100%)
            `,
          }}
        >
          <div className="absolute top-0 right-0 opacity-20">
            <img
              src="https://maxdispo.com/wp-content/uploads/2025/02/Wholesailors-PNG-M-1.png"
              alt=""
              className="w-64 h-64"
            />
          </div>
          <div className="relative z-10 h-full backdrop-blur rounded-lg border border-black/50 p-6">
            <div className="flex flex-col items-center justify-center">
              <img
                alt="MaxDispo"
                className="w-20 h-auto transition-opacity duration-300"
                src="https://maxdispo.com/wp-content/uploads/2025/02/maxdispo-logo-white-1024x593.png"
              />

              <div className="my-5">
                <h6 className="text-white text-center text-lg">
                  Nationwide Dispo at MaxDispo.com
                </h6>
                <p className="text-white text-center">(Sell Your Deal in 72 Hours)</p>
              </div>
            </div>
            <a
              href="https://maxdispo.com"
              target="_blank"
              className="text-sm mt-10 flex items-center justify-center w-full flex-1 h-10 rounded-md p-3 transition-all duration-150 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(45deg, #C1A25B, #69522F)' }}
            >
              Visit Now
            </a>
          </div>
        </div>
      </div>

      {/* Your Leads Section - Conditionally render Coming Soon or LeadClaimPanel */}
      {countdownInfo.showCountdown ? (
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              Coming Soon
            </CardTitle>
            <CardDescription>
              Your leads are being prepared and will be available soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Clock className="size-16 text-muted-foreground" />
              <p className="text-lg font-medium text-muted-foreground">
                Your daily motivated seller leads will be available once the countdown completes
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Your Leads</CardTitle>
            <CardDescription>Claim and manage your daily motivated seller leads</CardDescription>
          </CardHeader>
          <CardContent>
            <LeadClaimPanel userSubscriptionPlan={userSubscriptionPlan} leadAccess={leadAccess} />
          </CardContent>
        </Card>
      )}

      {/* Onboarding Dialog - Shows when countdown is active */}
      {countdownInfo.showCountdown && ENABLE_ONBOARDING_DIALOG && (
        <OnboardingDialog
          isOpen={false}
          onClose={handleDismissOnboarding}
          targetDate={countdownInfo.targetDate}
          userClass={userSubscriptionPlan}
        />
      )}

      {/* Marketing Dialog - Toggle with showMarketingDialog state */}
      <MarketingDialog
        isOpen={showMarketingDialog}
        onClose={() => setShowMarketingDialog(false)}
        userRole = {userRole}
        userSubscriptionPlan = {userSubscriptionPlan}
      />
    </>
  );
}