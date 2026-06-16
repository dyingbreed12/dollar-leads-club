import { firstEmailList } from './emailList';

/**
 * Leads start date information for countdown timer
 */
export interface LeadsStartInfo {
  showCountdown: boolean;
  targetDate: Date | null;
  isFirstEmailUser: boolean;
}

/**
 * Time remaining breakdown
 */
export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

/**
 * Get leads start date information for a user
 * @param userEmail - User's email address
 * @param userClass - User's class ('Diamond' or 'Dollar')
 * @returns LeadsStartInfo object with countdown details
 */
export function getLeadsStartInfo(
  userEmail: string | null | undefined,
  userClass: string | null | undefined
): LeadsStartInfo {
  if (!userEmail || !userClass) {
    return {
      showCountdown: false,
      targetDate: null,
      isFirstEmailUser: false,
    };
  }

  // Check if user's email exists in the firstEmailList (either Diamond or Dollar)
  const isInDiamondList = firstEmailList.Diamond?.includes(userEmail) || false;
  const isInDollarList = firstEmailList.Dollar?.includes(userEmail) || false;
  const isFirstEmailUser = isInDiamondList || isInDollarList;

  // Create target dates in EST (November 17, 2025 and November 24, 2025)
  // Set time to 8:00 AM EST (13:00 UTC)
  const nov17_2025_EST = new Date('2025-11-17T13:00:00Z'); // 11/17/25 8am EST
  const nov24_2025_EST = new Date('2025-11-24T13:00:00Z'); // 11/24/25 8am EST

  // Get current date/time
  const now = new Date();

  let targetDate: Date | null = null;
  let showCountdown = false;

  if (isFirstEmailUser) {
    // User is in the first email list - target date is 11/17/25
    targetDate = nov17_2025_EST;
    showCountdown = now < nov17_2025_EST;
  } else {
    // User is NOT in the first email list - target date is 11/24/25
    targetDate = nov24_2025_EST;
    showCountdown = now < nov24_2025_EST;
  }

  // Exclude specific emails
  const excludeEmails = ['peymandlc@gmail.com', 'vansingco1@gmail.com'];

  if (excludeEmails.includes(userEmail)) {
    return {
      showCountdown: false,
      targetDate: null,
      isFirstEmailUser: false,
    };
  }

  return {
    showCountdown,
    targetDate: showCountdown ? targetDate : null,
    isFirstEmailUser,
  };
}

/**
 * Format time remaining until a target date
 * @param targetDate - Target date to countdown to
 * @returns TimeRemaining object with breakdown
 */
export function getTimeRemaining(targetDate: Date | null): TimeRemaining {
  if (!targetDate) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const now = new Date();
  const difference = targetDate.getTime() - now.getTime();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
  };
}

/**
 * Get ordinal suffix for a day number (1st, 2nd, 3rd, 4th, etc.)
 * @param day - Day of month (1-31)
 * @returns Ordinal suffix (st, nd, rd, th)
 */
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th'; // 11th, 12th, 13th, etc.
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Get billing date (30 days after target date) formatted as "Dec 24th"
 * @param targetDate - The leads start date
 * @returns Formatted billing date (e.g., "Dec 24th", "Jan 17th")
 */
export function getBillingDate(targetDate: Date | null): string {
  if (!targetDate) {
    return 'N/A';
  }

  // Create a new Date object to avoid mutating the original
  const billingDate = new Date(targetDate);

  // Add 30 days
  billingDate.setDate(billingDate.getDate() + 30);

  // Get month abbreviation (Jan, Feb, Mar, etc.)
  const monthAbbr = billingDate.toLocaleDateString('en-US', { month: 'short' });

  // Get day with ordinal suffix
  const day = billingDate.getDate();
  const dayWithSuffix = day + getOrdinalSuffix(day);

  return `${monthAbbr} ${dayWithSuffix}`;
}
