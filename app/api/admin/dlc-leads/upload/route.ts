import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createAdminClient } from '@/utils/supabase/server';
import { leadBatchRepository } from '@/repositories/lead-batch.repository';
import { leadRepository } from '@/repositories/lead.repository';
import Papa from 'papaparse';

// Extend timeout for large file processing (5 minutes)
export const maxDuration = 300;

interface ParsedLead {
  full_name: string | null;
  phone_number: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  email: string | null;
  notes: string | null;
  recording_url: string | null;
  estimate: number;
  mao: number;
  offer_price: number;
  avm: number;
  equity: number;
  market_status: string | null;
  property_type: string | null;
  lead_gen: string | null;
  raw_data: Record<string, unknown>;
}

// Normalize header: lowercase and remove spaces
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/\s+/g, '');
}

// Parse numeric value with default
function parseNumeric(value: unknown): number {
  if (!value) return 0;
  const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

// Map CSV row to lead object
function mapCsvRowToLead(row: Record<string, unknown>): ParsedLead {
  // Normalize all keys
  const normalizedRow: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalizedRow[normalizeHeader(key)] = value;
  }

  return {
    // Name mapping
    full_name:
      (normalizedRow.name as string) ||
      (normalizedRow.fullname as string) ||
      (normalizedRow.full_name as string) ||
      null,

    // Phone mapping
    phone_number:
      (normalizedRow.phone as string) ||
      (normalizedRow.phonenumber as string) ||
      (normalizedRow.phone_number as string) ||
      null,

    // Address mapping (check variations)
    street_address:
      (normalizedRow.address as string) ||
      (normalizedRow.propertyaddress as string) ||
      (normalizedRow.streetaddress as string) ||
      (normalizedRow.street_address as string) ||
      null,

    // City mapping
    city:
      (normalizedRow.city as string) ||
      (normalizedRow.cityname as string) ||
      null,

    // State mapping
    state:
      (normalizedRow.state as string) ||
      (normalizedRow.statecode as string) ||
      null,

    // Zip code mapping
    zip_code:
      (normalizedRow.zipcode as string) ||
      (normalizedRow.zip as string) ||
      (normalizedRow.zip_code as string) ||
      null,

    // Email
    email: (normalizedRow.email as string) || null,

    // Notes
    notes: (normalizedRow.notes as string) || null,

    // Recording URL (for Diamond leads)
    recording_url:
      (normalizedRow.callrecording as string) ||
      (normalizedRow.call_recording as string) ||
      (normalizedRow.recording as string) ||
      (normalizedRow.recordingurl as string) ||
      null,

    // Numeric fields
    estimate: parseNumeric(normalizedRow.estimate),
    mao: parseNumeric(normalizedRow.mao),
    offer_price:
      parseNumeric(normalizedRow.offerprice) || parseNumeric(normalizedRow.offer_price),
    avm: parseNumeric(normalizedRow.avm),
    equity: parseNumeric(normalizedRow.equity),

    // Market status (preserve CSV Status field as marketStatus)
    // Original CSV "Status" (On-Market/Off-Market) becomes market_status
    market_status: (normalizedRow.status as string) || null,

    // Property info
    property_type:
      (normalizedRow.propertytype as string) ||
      (normalizedRow.property_type as string) ||
      null,
    lead_gen:
      (normalizedRow.leadgen as string) || (normalizedRow.lead_gen as string) || null,

    // Preserve all original data
    raw_data: row,
  };
}

// Check for duplicates within last 6 months
async function checkForDuplicates(addresses: string[]): Promise<Set<string>> {
  const supabase = createAdminClient();
  const duplicates = new Set<string>();

  // Calculate 6 months ago
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Filter out empty addresses
  const validAddresses = addresses.filter((addr) => addr && addr.trim());

  if (validAddresses.length === 0) {
    return duplicates;
  }

  // Batch queries (500 at a time for better performance with large datasets)
  const BATCH_SIZE = 500;
  for (let i = 0; i < validAddresses.length; i += BATCH_SIZE) {
    const batch = validAddresses.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('leads')
      .select('street_address')
      .in('street_address', batch)
      .gte('created_at', sixMonthsAgo.toISOString());

    if (!error && data) {
      data.forEach((lead) => {
        if (lead.street_address) {
          duplicates.add(lead.street_address);
        }
      });
    }
  }

  return duplicates;
}

// Bulk insert leads in chunks to avoid payload size limits
async function bulkInsertLeads(
  leads: Array<{
    lead_batch_id: string;
    type: 'dollar-lead' | 'diamond-lead';
    status: 'available';
    full_name: string | null;
    street_address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    phone_number: string | null;
    email: string | null;
    property_type: string | null;
    lead_gen: string | null;
    estimate: number;
    mao: number;
    offer_price: number;
    avm: number;
    equity: number;
    market_status: string | null;
    recording_url: string | null;
    notes: string | null;
    raw_data: Record<string, unknown>;
  }>
): Promise<void> {
  const supabase = createAdminClient();
  const CHUNK_SIZE = 500; // Insert 500 records at a time

  for (let i = 0; i < leads.length; i += CHUNK_SIZE) {
    const chunk = leads.slice(i, i + CHUNK_SIZE);

    const { error } = await supabase.from('leads').insert(chunk);

    if (error) {
      throw new Error(
        `Failed to insert leads at chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${error.message}`
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate admin user
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const batchName = formData.get('batch_name') as string;
    const type = formData.get('type') as 'dollar-lead' | 'diamond-lead';
    const csvFile = formData.get('csv_file') as File;

    // Validate inputs
    if (!batchName || !type || !csvFile) {
      return NextResponse.json(
        { error: 'Missing required fields: batch_name, type, csv_file' },
        { status: 400 }
      );
    }

    if (type !== 'dollar-lead' && type !== 'diamond-lead') {
      return NextResponse.json(
        { error: 'Invalid lead type. Must be dollar-lead or diamond-lead' },
        { status: 400 }
      );
    }

    // Read CSV content
    const csvContent = await csvFile.text();

    // Parse CSV using PapaParse (following legacy logic)
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: `CSV parsing error: ${parseResult.errors[0].message}` },
        { status: 400 }
      );
    }

    const rows = parseResult.data as Record<string, unknown>[];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 });
    }

    // Transform all rows to lead objects
    const allLeads = rows.map(mapCsvRowToLead);
    console.log('allLeads: ', allLeads);
    // Extract addresses for duplicate check
    const addresses = allLeads
      .map((lead) => lead.street_address)
      .filter((addr): addr is string => !!addr);

    // Check for duplicates (6-month window)
    const duplicateAddresses = await checkForDuplicates(addresses);

    // Sort leads: imported vs skipped
    const importedLeads: ParsedLead[] = [];
    const skippedLeads: ParsedLead[] = [];

    for (const lead of allLeads) {
      // Leads WITHOUT addresses are not allowed to be imported 
      if (lead.street_address && lead.street_address.trim() && !duplicateAddresses.has(lead.street_address.trim())) {
        importedLeads.push(lead);
      } else {
        // Duplicate address or no address - skip
        skippedLeads.push(lead);
      }
    }

    // Upload CSV file to Supabase Storage
    const supabase = createAdminClient();
    const timestamp = Date.now();
    const safeFileName = csvFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `batches/${timestamp}_${safeFileName}`;

    const fileBuffer = await csvFile.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lead-files')
      .upload(storagePath, fileBuffer, {
        contentType: 'text/csv',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Continue without file upload if bucket doesn't exist
      // Store the file info anyway
    }

    // Get public URL (or placeholder if upload failed)
    let fileUrl = `/uploads/${storagePath}`;
    if (uploadData) {
      const { data: urlData } = supabase.storage.from('lead-files').getPublicUrl(uploadData.path);
      fileUrl = urlData.publicUrl;
    }

    // Create lead batch record
    const batch = await leadBatchRepository.create({
      user_id: session.user.id,
      batch_name: batchName,
      type: type,
      total_leads: allLeads.length,
      imported_leads: importedLeads.length,
      skipped_duplicates: skippedLeads.length,
      skipped_leads: skippedLeads.map((lead) => lead.raw_data) as Record<string, any>[],
      file_url: fileUrl,
      file_name: csvFile.name,
      file_size: csvFile.size,
    });

    // Bulk create leads in chunks for better performance with large datasets
    if (importedLeads.length > 0) {
      const leadsToCreate = importedLeads.map((lead) => ({
        lead_batch_id: batch.id,
        type: type,
        status: 'available' as const, // Internal status always 'available'
        full_name: lead.full_name,
        street_address: lead.street_address,
        city: lead.city,
        state: lead.state,
        zip_code: lead.zip_code,
        phone_number: lead.phone_number,
        email: lead.email,
        property_type: lead.property_type,
        lead_gen: lead.lead_gen,
        estimate: lead.estimate,
        mao: lead.mao,
        offer_price: lead.offer_price,
        avm: lead.avm,
        equity: lead.equity,
        market_status: lead.market_status,
        recording_url: lead.recording_url,
        notes: lead.notes,
        raw_data: lead.raw_data,
      }));

      // Use chunked insert for better performance with large datasets
      await bulkInsertLeads(leadsToCreate);
    }

    return NextResponse.json({
      success: true,
      batch_id: batch.id,
      imported: importedLeads.length,
      skipped: skippedLeads.length,
      total: allLeads.length,
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process CSV' },
      { status: 500 }
    );
  }
}
