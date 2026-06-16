/**
 * AI Filter dialog display information
 */
export interface AIFilterInfo {
  showDialog: boolean;
  triggerTime: Date;
}

/** * Check if current time is 8:00 AM EST or later.
 * @returns boolean indicating if dialog should be shown
 */
export function shouldShowAIFilterDialog(): boolean {
  const now = new Date();
  // Get current date/time in EST
  const estDate = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' })
  );
  const currentHour = estDate.getHours();
  // Show dialog only during 8 AM hour EST or later
  return currentHour >= 8;
}