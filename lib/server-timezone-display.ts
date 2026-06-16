/**
 * Server Timezone Display Utilities
 *
 * Server-side helpers for formatting dates in the configured timezone.
 * These functions fetch the timezone from Supabase settings and format dates accordingly.
 *
 * IMPORTANT: These functions are for DISPLAY ONLY in Server Components.
 * All backend logic must remain in UTC.
 */

import { createClient } from '@/utils/supabase/server';
import {
  formatDateInTimezone,
  formatDateTimeInTimezone,
  formatDateLongInTimezone,
  formatTimeInTimezone,
  formatDateShortInTimezone,
} from './timezone-display';

// Cache timezone to avoid repeated database queries
let cachedTimezone: string | null = null;

/**
 * Get the configured timezone from Supabase settings
 * Caches the result to avoid repeated queries
 * @returns The configured timezone string (e.g., "America/New_York")
 */
export async function getServerTimezone(): Promise<string> {
  // Return cached value if available
  if (cachedTimezone) {
    return cachedTimezone;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('settings')
      .select('config')
      .eq('type', 'auto-claim')
      .single();

    if (error) {
      console.error('Error fetching timezone from settings:', error);
      return 'America/New_York'; // Default fallback
    }

    // Extract timezone from config
    const timezone = data?.config?.schedule?.timezone;

    if (timezone && typeof timezone === 'string') {
      cachedTimezone = timezone;
      return timezone;
    }

    // Fallback to default
    return 'America/New_York';
  } catch (error) {
    console.error('Error in getServerTimezone:', error);
    return 'America/New_York';
  }
}

/**
 * Format a date in the configured timezone (Server Component)
 * @param date - The date to format (in UTC)
 * @returns Formatted date string (e.g., "Nov 16, 2025")
 */
export async function formatDateServer(date: Date | null | undefined): Promise<string> {
  const timezone = await getServerTimezone();
  return formatDateInTimezone(date, timezone);
}

/**
 * Format a date and time in the configured timezone (Server Component)
 * @param date - The date to format (in UTC)
 * @returns Formatted datetime string (e.g., "Nov 16, 2025, 3:30 PM EST")
 */
export async function formatDateTimeServer(date: Date | null | undefined): Promise<string> {
  const timezone = await getServerTimezone();
  return formatDateTimeInTimezone(date, timezone);
}

/**
 * Format a date with long month name in the configured timezone (Server Component)
 * @param date - The date to format (in UTC)
 * @returns Formatted date string (e.g., "November 16, 2025")
 */
export async function formatDateLongServer(date: Date | null | undefined): Promise<string> {
  const timezone = await getServerTimezone();
  return formatDateLongInTimezone(date, timezone);
}

/**
 * Format time only in the configured timezone (Server Component)
 * @param date - The date to format (in UTC)
 * @returns Formatted time string (e.g., "3:30 PM EST")
 */
export async function formatTimeServer(date: Date | null | undefined): Promise<string> {
  const timezone = await getServerTimezone();
  return formatTimeInTimezone(date, timezone);
}

/**
 * Format a date in short numeric format in the configured timezone (Server Component)
 * @param date - The date to format (in UTC)
 * @returns Formatted date string (e.g., "11/16/2025")
 */
export async function formatDateShortServer(date: Date | null | undefined): Promise<string> {
  const timezone = await getServerTimezone();
  return formatDateShortInTimezone(date, timezone);
}

/**
 * Clear the timezone cache (useful for testing or when settings change)
 */
export function clearTimezoneCache(): void {
  cachedTimezone = null;
}
