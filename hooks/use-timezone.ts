/**
 * Timezone Hook for Client Components
 *
 * React hook that fetches the configured timezone from Supabase settings
 * and provides pre-bound formatting functions for displaying dates.
 *
 * IMPORTANT: This hook is for DISPLAY ONLY in Client Components.
 * All backend logic must remain in UTC.
 *
 * @example
 * ```typescript
 * 'use client';
 *
 * import { useTimezone } from '@/hooks/use-timezone';
 *
 * export function MyComponent() {
 *   const { formatDate, formatDateTime, loading } = useTimezone();
 *
 *   if (loading) return <div>Loading...</div>;
 *
 *   return <div>Created: {formatDate(user.created_at)}</div>;
 * }
 * ```
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  formatDateInTimezone,
  formatDateTimeInTimezone,
  formatDateLongInTimezone,
  formatTimeInTimezone,
  formatDateShortInTimezone,
} from '@/lib/timezone-display';

export interface UseTimezoneReturn {
  /** The configured timezone (e.g., "America/New_York") */
  timezone: string;
  /** Loading state while fetching timezone from settings */
  loading: boolean;
  /** Format date (e.g., "Nov 16, 2025") */
  formatDate: (date: Date | null | undefined) => string;
  /** Format datetime with timezone (e.g., "Nov 16, 2025, 3:30 PM EST") */
  formatDateTime: (date: Date | null | undefined) => string;
  /** Format date with long month (e.g., "November 16, 2025") */
  formatDateLong: (date: Date | null | undefined) => string;
  /** Format time only (e.g., "3:30 PM EST") */
  formatTime: (date: Date | null | undefined) => string;
  /** Format date in short format (e.g., "11/16/2025") */
  formatDateShort: (date: Date | null | undefined) => string;
}

/**
 * Hook to get timezone from settings and format dates accordingly
 * @returns Timezone, loading state, and formatting functions
 */
export function useTimezone(): UseTimezoneReturn {
  const [timezone, setTimezone] = useState<string>('America/New_York');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTimezone() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('settings')
          .select('config')
          .eq('type', 'auto-claim')
          .single();

        if (error) {
          console.error('Error fetching timezone from settings:', error);
          setTimezone('America/New_York'); // Default fallback
          return;
        }

        // Extract timezone from config
        const tz = data?.config?.schedule?.timezone;

        if (tz && typeof tz === 'string') {
          setTimezone(tz);
        } else {
          setTimezone('America/New_York'); // Default fallback
        }
      } catch (error) {
        console.error('Error in useTimezone:', error);
        setTimezone('America/New_York'); // Default fallback
      } finally {
        setLoading(false);
      }
    }

    fetchTimezone();
  }, []);

  return {
    timezone,
    loading,
    formatDate: (date: Date | null | undefined) => formatDateInTimezone(date, timezone),
    formatDateTime: (date: Date | null | undefined) =>
      formatDateTimeInTimezone(date, timezone),
    formatDateLong: (date: Date | null | undefined) =>
      formatDateLongInTimezone(date, timezone),
    formatTime: (date: Date | null | undefined) => formatTimeInTimezone(date, timezone),
    formatDateShort: (date: Date | null | undefined) =>
      formatDateShortInTimezone(date, timezone),
  };
}
