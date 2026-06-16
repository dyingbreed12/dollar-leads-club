import { LeadResponseDTO } from '@/types/lead.types';

/**
 * CSV generation utilities for lead downloads
 */

/**
 * Generate CSV content from leads
 */
export function generateLeadsCSV(
  leads: LeadResponseDTO[],
  includeRecording: boolean = false
): string {
  if (leads.length === 0) {
    return '';
  }

  // Export fields matching the new CSV structure:
  // Name, Phone, Address, City, State, Zip Code, Email, Notes, Call Recording, Estimate, MAO, Offer Price, Equity, Status
  const headerLabels = [
    'Name',
    'Phone',
    'Address',
    'City',
    'State',
    'Zip Code',
    'Email',
    'Notes'
  ];

  const headerKeys = [
    'name',
    'phone',
    'address',
    'city',
    'state',
    'zipcode',
    'email',
    'notes'
  ];

  // Add call recording column if requested (for Diamond/Exclusive leads)
  if (includeRecording) {
    headerLabels.push('Call Recording');
    headerKeys.push('callrecording');
  }

  // Add financial and status fields
  // headerLabels.push('Estimate', 'MAO', 'Offer Price', 'Equity', 'Status');
  // headerKeys.push('estimate', 'mao', 'offerprice', 'equity', 'marketStatus');

  // Create CSV content with header labels
  let csv = headerLabels.join(',') + '\n';

  leads.forEach(lead => {
    const row = headerKeys.map(key => {
      let value = '';
      const leadAny = lead as any; // Type assertion for flexible field access

      // Handle Name field (new CSV structure)
      // CSV import converts "Name" to "name" (lowercase)
      if (key === 'name') {
        value = leadAny.name || leadAny.fullname || leadAny.fullName || leadAny['Full Name'] ||
                leadAny.full_name || lead.full_name ||
                `${leadAny.firstname || ''} ${leadAny.lastname || ''}`.trim() || '';
      }
      // Handle Address field (new CSV structure uses just "Address")
      // CSV import converts "Address" to "address" (lowercase)
      else if (key === 'address') {
        value = leadAny.address || leadAny.streetaddress || leadAny.streetAddress ||
                leadAny['Street Address'] || leadAny.street_address || lead.street_address || '';
      }
      // Handle Phone field (new CSV structure uses just "Phone")
      // CSV import converts "Phone" to "phone" (lowercase)
      else if (key === 'phone') {
        value = leadAny.phone || leadAny.phonenumber || leadAny.phoneNumber ||
                leadAny['Phone Number'] || leadAny.phone_number || lead.phone_number || '';
      }
      // Handle Zip Code field
      // CSV import converts "Zip Code" to "zipcode" (lowercase, no space)
      else if (key === 'zipcode') {
        value = leadAny.zipcode || leadAny.zip || leadAny.Zip ||
                leadAny['Zip Code'] || leadAny.zip_code || lead.zip_code || '';
      }
      // Handle Call Recording field with multiple variations
      else if (key === 'callrecording') {
        value = leadAny.callrecording || leadAny.callRecording || leadAny['Call Recording'] ||
                leadAny.recording || leadAny.Recording || leadAny['call recording'] ||
                leadAny['Call Recordings'] || leadAny.recording_url || lead.recording_url || '';
      }
      // Handle Estimate field (replaces AVM)
      else if (key === 'estimate') {
        value = leadAny.estimate || leadAny.Estimate || lead.estimate ||
                leadAny.avm || leadAny.AVM || lead.avm || '';
      }
      // Handle MAO field
      else if (key === 'mao') {
        value = leadAny.mao || leadAny.MAO || lead.mao || '';
      }
      // Handle Offer Price field
      // CSV import converts "Offer Price" to "offerprice" (lowercase, no space)
      else if (key === 'offerprice') {
        value = leadAny.offerprice || leadAny.offerPrice || leadAny['Offer Price'] ||
                leadAny.offer_price || lead.offer_price || '';
      }
      // Handle Equity field
      else if (key === 'equity') {
        value = leadAny.equity || leadAny.Equity || lead.equity || '';
      }
      // Handle Status field (marketStatus stores CSV Status: On-Market/Off-Market)
      else if (key === 'marketStatus') {
        value = leadAny.marketStatus || leadAny.market_status || lead.market_status || '';
      }
      // Handle City field
      else if (key === 'city') {
        value = leadAny.city || lead.city || '';
      }
      // Handle State field
      else if (key === 'state') {
        value = leadAny.state || lead.state || '';
      }
      // Handle Email field
      else if (key === 'email') {
        value = leadAny.email || lead.email || '';
      }
      // Handle Notes field
      else if (key === 'notes') {
        value = leadAny.notes || leadAny.Notes || lead.notes || '';
      }
      // Handle other fields with both camelCase and space-separated variations
      else {
        // Try lowercase (CSV import format), then camelCase, then space-separated with capitals
        const lowercaseKey = key.toLowerCase().replace(/\s+/g, ''); // Convert to CSV import format
        const spacedKey = key.replace(/([A-Z])/g, ' $1').trim();
        const capitalizedKey = spacedKey.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        value = leadAny[lowercaseKey] || leadAny[key] || leadAny[capitalizedKey] || '';
      }

      // Escape commas, quotes, and newlines
      value = value.toString();
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csv += row.join(',') + '\n';
  });

  return csv;
}

/**
 * Escape a field for CSV (handle commas, quotes, newlines)
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Format number as currency string
 */
function formatCurrency(value: number): string {
  if (!value || value === 0) return '$0.00';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Trigger CSV download in browser
 */
export function downloadCSV(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Generate filename for leads CSV
 */
export function generateLeadsFileName(type: 'dollar-lead' | 'diamond-lead', date?: Date): string {
  const leadTypeName = type === 'dollar-lead' ? 'Dollar' : 'Diamond';
  const dateStr = (date || new Date()).toISOString().split('T')[0];
  return `${leadTypeName}_Leads_${dateStr}.csv`;
}

/**
 * Generate filename for all leads CSV
 */
export function generateAllLeadsFileName(type: 'dollar-lead' | 'diamond-lead'): string {
  const leadTypeName = type === 'dollar-lead' ? 'Dollar' : 'Diamond';
  const dateStr = new Date().toISOString().split('T')[0];
  return `All_${leadTypeName}_Leads_${dateStr}.csv`;
}
