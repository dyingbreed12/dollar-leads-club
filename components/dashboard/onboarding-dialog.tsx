'use client';

import { CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OnboardingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetDate: Date | null;
  userClass: string | null;
}

export function OnboardingDialog({
  isOpen,
  onClose,
  targetDate,
  userClass,
}: OnboardingDialogProps) {
  /**
   * Format date as "November 17, 2025"
   */
  const formatFullDate = (date: Date | null): string => {
    if (!date) return 'Soon';

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York', // EST timezone
    };

    return new Date(date).toLocaleDateString('en-US', options);
  };

  // Determine lead type based on user class
  const leadType = userClass === 'Diamond' ? 'Diamond Leads' : 'Dollar Leads';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="lg:max-w-[600px] w-full flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Our call centers are onboarding your profile and generating leads specifically for your
            account
          </DialogTitle>
          <DialogDescription className="sr-only">
            Your account setup and lead activation status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Checklist */}
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="size-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">Your account is fully set up</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="size-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">
                Your lead type is activated (<strong>{leadType}</strong>)
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="size-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">
                Your next billing doesn&apos;t hit until 30 days after you start receiving leads
              </span>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="size-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">You don&apos;t need to do anything else</span>
            </li>
          </ul>

          {/* High Demand Notice */}
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="size-5 text-yellow-500" />
            <AlertDescription className="ml-2">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">High Demand Notice:</p>
                <p className="text-sm text-muted-foreground">
                  Due to overwhelming demand, your current lead start date is{' '}
                  <strong className="text-foreground">{formatFullDate(targetDate)}</strong>
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full text-wrap whitespace-normal text-xs md:text-lg" size="lg">
            I UNDERSTAND THAT MY LEADS ARE COMING SOON
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
