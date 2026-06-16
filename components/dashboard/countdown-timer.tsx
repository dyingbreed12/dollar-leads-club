'use client';

import { useEffect, useState } from 'react';
import { formatTimeRemaining } from '@/lib/date-helpers';
import { useTimezone } from '@/hooks/use-timezone';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  targetDate: Date;
  label?: string;
  message?: string;
  onComplete?: () => void;
  showFullDate?: boolean;
}

export function CountdownTimer({
  targetDate,
  label = 'Next claim available in:',
  message,
  onComplete,
  showFullDate = false,
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);
  const { formatDateTime, loading: tzLoading } = useTimezone();

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Now');
        setIsComplete(true);
        if (onComplete && !isComplete) {
          onComplete();
        }
        return;
      }

      setTimeRemaining(formatTimeRemaining(target));
    };

    // Initial update
    updateCountdown();

    // Update every second
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete, isComplete]);

  if (tzLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="size-4" />
        <span className="text-sm">
          {label} <span className="font-medium text-foreground text-lg">{timeRemaining}</span>
        </span>
      </div>
      {showFullDate && (
        <p className="text-sm text-muted-foreground text-center">
          {formatDateTime(targetDate)}
        </p>
      )}
      {message && <p className="text-sm text-muted-foreground text-center">{message}</p>}
    </div>
  );
}
