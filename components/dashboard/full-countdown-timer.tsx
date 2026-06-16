'use client';

import { useState, useEffect } from 'react';
import { getBillingDate, getTimeRemaining, type TimeRemaining } from '@/utils/customs/leadsStartDate';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface FullCountdownTimerProps {
  targetDate: Date;
}

export function FullCountdownTimer({ targetDate }: FullCountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(getTimeRemaining(targetDate));

  useEffect(() => {
    if (!targetDate) return;

    // Update countdown every second
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(targetDate);
      setTimeRemaining(remaining);

      // Clear interval if countdown expired
      if (remaining.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [targetDate]);

  // Don't render if countdown expired or no target date
  if (!targetDate || timeRemaining.isExpired) {
    return null;
  }

  const { days, hours, minutes, seconds } = timeRemaining;

  return (
    <Card className="bg-secondary border-primary">
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Countdown Timer */}
          <div className="flex items-center justify-center gap-2">
            {/* Days */}
            <div className="flex flex-col items-center">
              <div className="text-5xl font-bold text-primary">{days}</div>
              <div className="text-sm text-muted-foreground font-medium">
                {days === 1 ? 'Day' : 'Days'}
              </div>
            </div>

            {/* Separator */}
            <div className="text-4xl font-bold text-muted-foreground pb-5">:</div>

            {/* Hours */}
            <div className="flex flex-col items-center">
              <div className="text-5xl font-bold text-primary">
                {hours.toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-muted-foreground font-medium">Hours</div>
            </div>

            {/* Separator */}
            <div className="text-4xl font-bold text-muted-foreground pb-5">:</div>

            {/* Minutes */}
            <div className="flex flex-col items-center">
              <div className="text-5xl font-bold text-primary">
                {minutes.toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-muted-foreground font-medium">Minutes</div>
            </div>

            {/* Separator */}
            <div className="text-4xl font-bold text-muted-foreground pb-5">:</div>

            {/* Seconds */}
            <div className="flex flex-col items-center">
              <div className="text-5xl font-bold text-primary">
                {seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-muted-foreground font-medium">Seconds</div>
            </div>
          </div>

          {/* Info Section */}
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-foreground">Until Your Leads Start</p>
            <p className="text-sm text-muted-foreground">
              Your next billing doesn&apos;t hit until 30 days after you start receiving leads - so
              your next charge is <span className="font-bold">{getBillingDate(targetDate)}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
