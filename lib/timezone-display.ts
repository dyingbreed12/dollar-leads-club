/**
 * Timezone Display Utilities
 *
 * Core formatting functions for displaying dates in a specific timezone.
 * These functions convert UTC dates to the configured timezone for display purposes only.
 *
 * IMPORTANT: These functions are for DISPLAY ONLY. All backend logic, storage,
 * and business calculations must remain in UTC.
 */

/**
 * Format a date in the specified timezone
 * @param date - The date to format (in UTC)
 * @param timezone - The IANA timezone string (e.g., "America/New_York")
 * @returns Formatted date string (e.g., "Nov 16, 2025")
 */
export function formatDateInTimezone(date: Date | null | undefined, timezone: string): string {
  if (!date) return 'N/A';

  try {
    return new Date(date).toLocaleDateString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
}

/**
 * Format a date and time in the specified timezone with timezone abbreviation
 * @param date - The date to format (in UTC)
 * @param timezone - The IANA timezone string (e.g., "America/New_York")
 * @returns Formatted datetime string (e.g., "Nov 16, 2025, 3:30 PM EST")
 */
export function formatDateTimeInTimezone(
  date: Date | null | undefined,
  timezone: string
): string {
  if (!date) return 'N/A';

  try {
    const dateObj = new Date(date);

    // Format date and time
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const formatted = formatter.format(dateObj);

    // Get timezone abbreviation (EST, PST, etc.)
    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });

    const parts = tzFormatter.formatToParts(dateObj);
    const tzName = parts.find((part) => part.type === 'timeZoneName')?.value || '';

    return tzName ? `${formatted} ${tzName}` : formatted;
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Invalid Date';
  }
}

/**
 * Format a date with long month name in the specified timezone
 * @param date - The date to format (in UTC)
 * @param timezone - The IANA timezone string (e.g., "America/New_York")
 * @returns Formatted date string (e.g., "November 16, 2025")
 */
export function formatDateLongInTimezone(
  date: Date | null | undefined,
  timezone: string
): string {
  if (!date) return 'N/A';

  try {
    return new Date(date).toLocaleDateString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting long date:', error);
    return 'Invalid Date';
  }
}

/**
 * Format time only in the specified timezone with timezone abbreviation
 * @param date - The date to format (in UTC)
 * @param timezone - The IANA timezone string (e.g., "America/New_York")
 * @returns Formatted time string (e.g., "3:30 PM EST")
 */
export function formatTimeInTimezone(date: Date | null | undefined, timezone: string): string {
  if (!date) return 'N/A';

  try {
    const dateObj = new Date(date);

    // Format time
    const timeStr = dateObj.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Get timezone abbreviation
    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });

    const parts = tzFormatter.formatToParts(dateObj);
    const tzName = parts.find((part) => part.type === 'timeZoneName')?.value || '';

    return tzName ? `${timeStr} ${tzName}` : timeStr;
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid Time';
  }
}

/**
 * Format a date in short numeric format in the specified timezone
 * @param date - The date to format (in UTC)
 * @param timezone - The IANA timezone string (e.g., "America/New_York")
 * @returns Formatted date string (e.g., "11/16/2025")
 */
export function formatDateShortInTimezone(
  date: Date | null | undefined,
  timezone: string
): string {
  if (!date) return 'N/A';

  try {
    return new Date(date).toLocaleDateString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting short date:', error);
    return 'Invalid Date';
  }
}
