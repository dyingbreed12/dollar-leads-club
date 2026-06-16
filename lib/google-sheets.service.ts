import { google } from 'googleapis';

/**
 * Google Sheets Service for Dashboard Stats Tracking
 * Tracks aggregate subscription statistics in Google Sheets
 */
class GoogleSheetsService {
  private sheets;
  private spreadsheetId: string;
  private sheetName: string = 'Dashboard';

  constructor() {
    // Initialize Google Sheets API authentication
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID || '';
  }

  /**
   * Update dashboard stats in Google Sheets
   * Increments counters based on subscription plan type
   *
   * @param userClass - 'dollar-lead' or 'diamond-lead'
   * @param name - User's full name
   * @param email - User's email address
   */
  async updateDashboardStats(
    userClass: string,
    name: string,
    email: string
  ): Promise<void> {
    try {
      if (!this.spreadsheetId) {
        console.warn('[Google Sheets] GOOGLE_SHEET_ID not configured, skipping update');
        return;
      }

      // Read current values from Row 2
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A2:F2`, // Row 2 contains current stats
      });

      const currentValues = response.data.values?.[0] || [0, 0, 0, '', ''];

      let dollarCount = parseInt(currentValues[1] as string) || 0;
      let diamondCount = parseInt(currentValues[2] as string) || 0;
      let totalSignups = parseInt(currentValues[3] as string) || 0;

      // Map subscription plan to userClass format
      // 'dollar-lead' -> 'Dollar', 'diamond-lead' -> 'Diamond'
      const mappedUserClass = this.mapPlanToUserClass(userClass);

      // Increment based on user class
      if (mappedUserClass === 'Dollar') {
        dollarCount++;
      } else if (mappedUserClass === 'Diamond') {
        diamondCount++;
      }
      totalSignups++;

      // Update the row with new values
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A2:F2`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            new Date().toISOString(), // A: Last Update Timestamp
            dollarCount,              // B: Dollar Lead Count
            diamondCount,             // C: Diamond Lead Count
            totalSignups,             // D: Total Signups
            name,                     // E: Last Customer Name
            email,                    // F: Last Customer Email
          ]],
        },
      });

      console.log('[Google Sheets] ✅ Dashboard updated successfully:', {
        dollarCount,
        diamondCount,
        totalSignups,
        lastCustomer: name,
        lastEmail: email,
      });
    } catch (error) {
      console.error('[Google Sheets] ❌ Error updating dashboard:', error instanceof Error ? error.message : error);
      // Don't throw - we don't want to fail the webhook if Sheets update fails
    }
  }

  /**
   * Map subscription plan names to userClass format
   * @param plan - 'dollar-lead' or 'diamond-lead'
   * @returns 'Dollar' or 'Diamond'
   */
  private mapPlanToUserClass(plan: string): string {
    const mapping: Record<string, string> = {
      'dollar-lead': 'Dollar',
      'diamond-lead': 'Diamond',
    };
    return mapping[plan] || '';
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsService();
