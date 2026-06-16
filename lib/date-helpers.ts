/**
 * Date helper utilities for lead claiming system
 */

/**
 * Get the next claim date (8 AM UTC tomorrow)
 */
export function getNextClaimDate(): Date {
  const nextClaim = new Date();
  nextClaim.setUTCDate(nextClaim.getUTCDate() + 1);
  nextClaim.setUTCHours(8, 0, 0, 0);
  return nextClaim;
}

/**
 * Format time remaining until a date
 * @returns Formatted string like "8h 30m" or "30m"
 */
export function formatTimeRemaining(targetDate: Date): string {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    return 'Now';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Format a full countdown display (UTC)
 * @returns String like "8:00 AM UTC on Nov 17 (8h 30m)"
 */
export function formatFullCountdown(targetDate: Date): string {
  const resetTime = targetDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });

  const resetDateStr = targetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const timeRemaining = formatTimeRemaining(targetDate);

  return `${resetTime} UTC on ${resetDateStr} (${timeRemaining})`;
}

/**
 * Format a date for display (UTC)
 * @returns String like "11/16/2025"
 */
export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Check if a date is today (UTC)
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  const compareDate = new Date(date);

  return (
    today.getUTCFullYear() === compareDate.getUTCFullYear() &&
    today.getUTCMonth() === compareDate.getUTCMonth() &&
    today.getUTCDate() === compareDate.getUTCDate()
  );
}

/**
 * Check if today is a weekday (UTC)
 */
export function isWeekday(): boolean {
  const day = new Date().getUTCDay();
  return day >= 1 && day <= 5;
}

/**
 * Get the next Monday date (8 AM UTC)
 */
export function getNextMonday(): Date {
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

  const nextMonday = new Date(today);
  nextMonday.setUTCDate(today.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(8, 0, 0, 0);

  return nextMonday;
}

/**
 * Format relative time (e.g., "Today at 9:00 AM UTC", "Yesterday at 2:00 PM UTC")
 * Uses UTC for date comparisons
 */
export function formatRelativeTime(date: Date): string {
  const inputDate = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const timeString = inputDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });

  if (
    inputDate.getUTCFullYear() === today.getUTCFullYear() &&
    inputDate.getUTCMonth() === today.getUTCMonth() &&
    inputDate.getUTCDate() === today.getUTCDate()
  ) {
    return `Today at ${timeString} UTC`;
  }

  if (
    inputDate.getUTCFullYear() === yesterday.getUTCFullYear() &&
    inputDate.getUTCMonth() === yesterday.getUTCMonth() &&
    inputDate.getUTCDate() === yesterday.getUTCDate()
  ) {
    return `Yesterday at ${timeString} UTC`;
  }

  return `${formatDate(inputDate)} at ${timeString} UTC`;
}
