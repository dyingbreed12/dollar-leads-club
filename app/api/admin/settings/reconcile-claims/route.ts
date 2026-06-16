import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth-utils';
import { createClient } from '@/utils/supabase/server';

interface ReconciliationResult {
  total_orphaned_leads: number;
  total_orphaned_claims: number;
  leads_linked: number;
  claims_fixed: number;
  errors: string[];
}

/**
 * POST /api/admin/settings/reconcile-claims
 * Reconcile user_claim_leads by linking claimed leads to their user_claims
 *
 * This fixes the issue where leads are marked as claimed (claimed_by is set)
 * but have no corresponding entry in the user_claim_leads junction table.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const result: ReconciliationResult = {
      total_orphaned_leads: 0,
      total_orphaned_claims: 0,
      leads_linked: 0,
      claims_fixed: 0,
      errors: [],
    };

    // Step 1: Find all claimed leads that don't have entries in user_claim_leads
    const { data: orphanedLeads, error: orphanedError } = await supabase
      .from('leads')
      .select('id, claimed_by, claimed_at, type')
      .eq('status', 'claimed')
      .not('claimed_by', 'is', null);

    if (orphanedError) {
      throw new Error(`Failed to fetch claimed leads: ${orphanedError.message}`);
    }

    if (!orphanedLeads || orphanedLeads.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No claimed leads found to reconcile',
        data: result,
      });
    }

    // Step 2: Check which leads already have junction entries
    const leadIds = orphanedLeads.map(l => l.id);
    const { data: existingLinks, error: linksError } = await supabase
      .from('user_claim_leads')
      .select('lead_id')
      .in('lead_id', leadIds);

    if (linksError) {
      throw new Error(`Failed to fetch existing links: ${linksError.message}`);
    }

    const existingLeadIds = new Set(existingLinks?.map(l => l.lead_id) || []);
    const leadsToLink = orphanedLeads.filter(l => !existingLeadIds.has(l.id));

    result.total_orphaned_leads = leadsToLink.length;

    if (leadsToLink.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All claimed leads are already properly linked',
        data: result,
      });
    }

    // Step 3: Find user_claims that have no leads linked (orphaned claims)
    const { data: allClaims, error: claimsError } = await supabase
      .from('user_claims')
      .select(`
        id,
        user_id,
        type,
        lead_count,
        claimed_at,
        user_claim_leads (
          id
        )
      `)
      .order('claimed_at', { ascending: false });

    if (claimsError) {
      throw new Error(`Failed to fetch user claims: ${claimsError.message}`);
    }

    // Find claims with fewer linked leads than their lead_count
    const orphanedClaims = allClaims?.filter(claim => {
      const linkedCount = (claim.user_claim_leads as any[])?.length || 0;
      return linkedCount < claim.lead_count;
    }) || [];

    result.total_orphaned_claims = orphanedClaims.length;

    // Step 4: Match orphaned leads to orphaned claims
    // Group leads by user_id and type
    const leadsByUserAndType: Record<string, typeof leadsToLink> = {};
    for (const lead of leadsToLink) {
      const key = `${lead.claimed_by}_${lead.type}`;
      if (!leadsByUserAndType[key]) {
        leadsByUserAndType[key] = [];
      }
      leadsByUserAndType[key].push(lead);
    }

    // Process each orphaned claim
    for (const claim of orphanedClaims) {
      const key = `${claim.user_id}_${claim.type}`;
      const availableLeads = leadsByUserAndType[key] || [];

      if (availableLeads.length === 0) {
        continue;
      }

      const linkedCount = (claim.user_claim_leads as any[])?.length || 0;
      const neededCount = claim.lead_count - linkedCount;

      // Take leads - if claimed_at is available, sort by proximity to claim time
      // Otherwise, just take in order
      const sortedLeads = availableLeads.sort((a, b) => {
        if (a.claimed_at && b.claimed_at) {
          const aTime = new Date(a.claimed_at).getTime();
          const bTime = new Date(b.claimed_at).getTime();
          const claimTime = new Date(claim.claimed_at).getTime();
          return Math.abs(aTime - claimTime) - Math.abs(bTime - claimTime);
        }
        // If claimed_at is null, maintain current order
        return 0;
      });

      const leadsToAssign = sortedLeads.slice(0, neededCount);

      // Create junction entries
      for (const lead of leadsToAssign) {
        const { error: insertError } = await supabase
          .from('user_claim_leads')
          .insert({
            user_claim_id: claim.id,
            lead_id: lead.id,
          });

        if (insertError) {
          result.errors.push(`Failed to link lead ${lead.id} to claim ${claim.id}: ${insertError.message}`);
        } else {
          result.leads_linked++;
          // Remove the lead from available pool
          const index = leadsByUserAndType[key].findIndex(l => l.id === lead.id);
          if (index > -1) {
            leadsByUserAndType[key].splice(index, 1);
          }
        }
      }

      if (leadsToAssign.length > 0) {
        result.claims_fixed++;
      }
    }

    // Log the reconciliation
    await supabase.from('system_logs').insert({
      event_type: 'claims_reconciliation',
      event_data: {
        admin_id: session.user.id,
        result,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Reconciliation complete. Linked ${result.leads_linked} leads to ${result.claims_fixed} claims.`,
      data: result,
    });
  } catch (error) {
    console.error('Error reconciling claims:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reconcile claims' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/settings/reconcile-claims
 * Get statistics on orphaned leads and claims
 */
export async function GET() {
  try {
    const session = await getAdminSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Count claimed leads without junction entries
    const { data: claimedLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('status', 'claimed')
      .not('claimed_by', 'is', null);

    const leadIds = claimedLeads?.map(l => l.id) || [];

    let orphanedLeadCount = 0;
    if (leadIds.length > 0) {
      const { data: linkedLeads } = await supabase
        .from('user_claim_leads')
        .select('lead_id')
        .in('lead_id', leadIds);

      const linkedIds = new Set(linkedLeads?.map(l => l.lead_id) || []);
      orphanedLeadCount = leadIds.filter(id => !linkedIds.has(id)).length;
    }

    // Count claims with missing leads
    const { data: allClaims } = await supabase
      .from('user_claims')
      .select(`
        id,
        lead_count,
        user_claim_leads (
          id
        )
      `);

    const orphanedClaimCount = allClaims?.filter(claim => {
      const linkedCount = (claim.user_claim_leads as any[])?.length || 0;
      return linkedCount < claim.lead_count;
    }).length || 0;

    return NextResponse.json({
      success: true,
      data: {
        orphaned_leads: orphanedLeadCount,
        orphaned_claims: orphanedClaimCount,
        total_claimed_leads: leadIds.length,
        total_claims: allClaims?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching reconciliation stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reconciliation statistics' },
      { status: 500 }
    );
  }
}
