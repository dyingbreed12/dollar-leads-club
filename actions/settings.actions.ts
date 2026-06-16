'use server';

import { settingsService } from '@/services/settings.service';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-utils';
import { UpdateAutoClaimConfigDTO, AutoClaimSettingResponseDTO } from '@/types/settings.types';

interface ActionResult<T = unknown> {
  success: boolean;
  error?: string;
  message?: string;
  data?: T;
}

/**
 * Get auto-claim configuration
 */
export async function getAutoClaimConfigAction(): Promise<ActionResult<AutoClaimSettingResponseDTO>> {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    const config = await settingsService.getAutoClaimConfig();

    if (!config) {
      return { success: false, error: 'Auto-claim configuration not found' };
    }

    return { success: true, data: config };
  } catch (error) {
    console.error('Error fetching auto-claim config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch auto-claim configuration',
    };
  }
}

/**
 * Update auto-claim configuration
 */
export async function updateAutoClaimConfigAction(
  updates: UpdateAutoClaimConfigDTO
): Promise<ActionResult<AutoClaimSettingResponseDTO>> {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    const updatedConfig = await settingsService.updateAutoClaimConfig(updates, admin.user.id);

    revalidatePath('/admin/settings');

    return {
      success: true,
      message: 'Auto-claim configuration updated successfully',
      data: updatedConfig,
    };
  } catch (error) {
    console.error('Error updating auto-claim config:', error);

    if (error instanceof Error) {
      if (error.message.includes('Validation errors')) {
        return { success: false, error: error.message };
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update auto-claim configuration',
    };
  }
}

/**
 * Reset auto-claim configuration to defaults
 */
export async function resetAutoClaimConfigAction(): Promise<ActionResult<AutoClaimSettingResponseDTO>> {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    const resetConfig = await settingsService.resetAutoClaimConfig(admin.user.id);

    revalidatePath('/admin/settings');

    return {
      success: true,
      message: 'Auto-claim configuration reset to defaults',
      data: resetConfig,
    };
  } catch (error) {
    console.error('Error resetting auto-claim config:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset auto-claim configuration',
    };
  }
}

/**
 * Toggle auto-claim enabled/disabled
 */
export async function toggleAutoClaimEnabledAction(
  enabled: boolean
): Promise<ActionResult<AutoClaimSettingResponseDTO>> {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    const updatedConfig = await settingsService.setAutoClaimEnabled(enabled, admin.user.id);

    revalidatePath('/admin/settings');

    return {
      success: true,
      message: `Auto-claim ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: updatedConfig,
    };
  } catch (error) {
    console.error('Error toggling auto-claim:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle auto-claim',
    };
  }
}

/**
 * Get auto-claim status summary
 */
export async function getAutoClaimStatusAction(): Promise<
  ActionResult<{
    enabled: boolean;
    schedule: string;
    dollarPlanLeads: number;
    diamondPlanDiamondLeads: number;
    diamondPlanDollarLeads: number;
    lastUpdated: string;
  }>
> {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    const status = await settingsService.getAutoClaimStatus();

    return { success: true, data: status };
  } catch (error) {
    console.error('Error getting auto-claim status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get auto-claim status',
    };
  }
}

/**
 * Manual trigger result type
 */
interface ManualTriggerResult {
  success: boolean;
  target_date: string;
  claims_created: number;
  claims_updated: number;
  leads_distributed: number;
  users_processed: number;
  users_skipped: number;
  users_filled: number;
  errors: number;
  executed_at: string;
  is_target_weekday: boolean;
  message?: string;
}

/**
 * Manually run auto-claim for a specific date
 * Fills in missing claims for users who didn't get their full allocation
 * @param targetDate - The date to process (YYYY-MM-DD format)
 * @param userIds - Optional array of user IDs to process (empty/undefined = all eligible users)
 */
export async function runManualAutoClaimAction(
  targetDate?: string,
  userIds?: string[]
): Promise<ActionResult<ManualTriggerResult>> {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    // Validate target date
    // IMPORTANT: Use the targetDate string directly to avoid timezone conversion issues
    // new Date("2025-12-01") can be parsed as local midnight, which when converted
    // to UTC via toISOString() shifts the date backwards (e.g., to 2025-11-30)
    let formattedDate: string;

    if (targetDate) {
      // Validate format (YYYY-MM-DD)
      const dateMatch = targetDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!dateMatch) {
        return { success: false, error: 'Invalid date format. Expected YYYY-MM-DD' };
      }

      const [, yearStr, monthStr, dayStr] = dateMatch;
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);

      // Basic validation
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return { success: false, error: 'Invalid date' };
      }

      // Create UTC date for comparison (use noon to avoid edge cases)
      const dateToValidate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

      // Don't allow future dates
      const today = new Date();
      const todayEnd = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
        23, 59, 59, 999
      ));
      if (dateToValidate > todayEnd) {
        return { success: false, error: 'Cannot process claims for future dates' };
      }

      // Don't allow dates too far in the past (30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
      thirtyDaysAgo.setUTCHours(0, 0, 0, 0);
      if (dateToValidate < thirtyDaysAgo) {
        return { success: false, error: 'Cannot process claims older than 30 days' };
      }

      // Use the original string directly - it's already YYYY-MM-DD
      formattedDate = targetDate;
    } else {
      // Default to today in UTC
      const now = new Date();
      formattedDate = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    }

    // Call the database function directly
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();

    // If specific users are selected, process them individually
    if (userIds && userIds.length > 0) {
      const result: ManualTriggerResult = {
        success: true,
        target_date: formattedDate,
        claims_created: 0,
        claims_updated: 0,
        leads_distributed: 0,
        users_processed: 0,
        users_skipped: 0,
        users_filled: 0,
        errors: 0,
        executed_at: new Date().toISOString(),
        is_target_weekday: true,
      };

      // Get auto-claim config
      const { data: settingsData } = await supabase
        .from('settings')
        .select('config')
        .eq('type', 'auto-claim')
        .single();

      // Get timezone and local hour from settings
      const timezone = settingsData?.config?.schedule?.timezone || 'America/New_York';
      const localHour = Number(settingsData?.config?.schedule?.hour) || 8;

      // Calculate the claim window for target date
      // The date input (e.g., "2025-12-01") should be interpreted in the configured timezone (EST)
      // Then converted to UTC for storage
      const [year, month, day] = formattedDate.split('-').map(Number);

      // Create a datetime string and parse it in the configured timezone
      // e.g., "2025-12-01 08:00" in America/New_York = "2025-12-01T13:00:00Z" in UTC
      const localDateTimeStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(localHour).padStart(2, '0')}:00:00`;

      // Use Intl.DateTimeFormat to get the UTC offset for the timezone on this specific date
      // This handles DST correctly
      const getTimezoneOffsetMs = (tz: string, date: Date): number => {
        const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
        const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
        return utcDate.getTime() - tzDate.getTime();
      };

      // Parse the local datetime and adjust for timezone
      const naiveDate = new Date(localDateTimeStr);
      const offsetMs = getTimezoneOffsetMs(timezone, naiveDate);
      const cutoffStart = new Date(naiveDate.getTime() + offsetMs);
      const cutoffEnd = new Date(cutoffStart);
      cutoffEnd.setUTCDate(cutoffEnd.getUTCDate() + 1);

      for (const userId of userIds) {
        try {
          // Get user info
          const { data: user } = await supabase
            .from('users')
            .select('id, subscription_plan, subscription_status, lead_access')
            .eq('id', userId)
            .single();

          if (!user || user.subscription_status !== 'active' || !user.lead_access) {
            result.users_skipped++;
            continue;
          }

          result.users_processed++;

          // Get plan config
          const planConfig = settingsData?.config?.plans?.[user.subscription_plan || 'dollar-lead'] || {
            dollar_leads: 5,
            diamond_leads: 0,
            weekdays_only: true,
          };

          // Process dollar leads
          if (planConfig.dollar_leads > 0) {
            // Check if user already has a dollar-lead claim for this date
            const { data: existingClaims } = await supabase
              .from('user_claims')
              .select('id, lead_count')
              .eq('user_id', userId)
              .eq('type', 'dollar-lead')
              .gte('claimed_at', cutoffStart.toISOString())
              .lt('claimed_at', cutoffEnd.toISOString())
              .order('claimed_at', { ascending: false })
              .limit(1);

            if (existingClaims && existingClaims.length > 0) {
              // Existing claim found - calculate shortfall
              const existingClaim = existingClaims[0];
              const shortfall = planConfig.dollar_leads - existingClaim.lead_count;

              if (shortfall > 0) {
                // UPDATE existing claim by adding more leads
                const { data: leadsAdded, error: updateError } = await supabase.rpc('add_leads_to_claim', {
                  p_claim_id: existingClaim.id,
                  p_lead_count: shortfall,
                });

                if (!updateError && leadsAdded) {
                  result.claims_updated++;
                  result.leads_distributed += leadsAdded;
                } else if (updateError) {
                  result.errors++;
                }
              }
              // If shortfall <= 0, user already has enough or more leads, skip
            } else {
              // No existing claim - CREATE new one
              const { data: claimId, error: dollarError } = await supabase.rpc('create_user_claim', {
                p_user_id: userId,
                p_type: 'dollar-lead',
                p_lead_count: planConfig.dollar_leads,
              });
              console.log('claimId', claimId);
              console.log('dollarError', dollarError);
              if (!dollarError && claimId) {
                // FIX: Update claimed_at to target date (matching process_missing_claims behavior)
                console.log('updating claimed_at to', cutoffStart.toISOString(), cutoffStart);
                await supabase
                  .from('user_claims')
                  .update({ claimed_at: cutoffStart.toISOString() })
                  .eq('id', claimId);

                result.claims_created++;
                result.leads_distributed += planConfig.dollar_leads;
              } else if (dollarError) {
                result.errors++;
              }
            }
          }

          // Process diamond leads (only for diamond plan)
          if (planConfig.diamond_leads > 0 && user.subscription_plan === 'diamond-lead') {
            // Check if user already has a diamond-lead claim for this date
            const { data: existingClaims } = await supabase
              .from('user_claims')
              .select('id, lead_count')
              .eq('user_id', userId)
              .eq('type', 'diamond-lead')
              .gte('claimed_at', cutoffStart.toISOString())
              .lt('claimed_at', cutoffEnd.toISOString())
              .order('claimed_at', { ascending: false })
              .limit(1);

            if (existingClaims && existingClaims.length > 0) {
              // Existing claim found - calculate shortfall
              const existingClaim = existingClaims[0];
              const shortfall = planConfig.diamond_leads - existingClaim.lead_count;

              if (shortfall > 0) {
                // UPDATE existing claim by adding more leads
                const { data: leadsAdded, error: updateError } = await supabase.rpc('add_leads_to_claim', {
                  p_claim_id: existingClaim.id,
                  p_lead_count: shortfall,
                });

                if (!updateError && leadsAdded) {
                  result.claims_updated++;
                  result.leads_distributed += leadsAdded;
                } else if (updateError) {
                  result.errors++;
                }
              }
              // If shortfall <= 0, user already has enough or more leads, skip
            } else {
              // No existing claim - CREATE new one
              const { data: claimId, error: diamondError } = await supabase.rpc('create_user_claim', {
                p_user_id: userId,
                p_type: 'diamond-lead',
                p_lead_count: planConfig.diamond_leads,
              });

              if (!diamondError && claimId) {
                // FIX: Update claimed_at to target date (matching process_missing_claims behavior)
                await supabase
                  .from('user_claims')
                  .update({ claimed_at: cutoffStart.toISOString() })
                  .eq('id', claimId);

                result.claims_created++;
                result.leads_distributed += planConfig.diamond_leads;
              } else if (diamondError) {
                result.errors++;
              }
            }
          }

          result.users_filled++;
        } catch (err) {
          console.error(`Error processing user ${userId}:`, err);
          result.errors++;
        }
      }

      // Log the manual run
      await supabase.from('system_logs').insert({
        event_type: 'manual_auto_claim',
        event_data: {
          admin_id: admin.user.id,
          target_date: formattedDate,
          selected_users: userIds,
          result,
        },
      });

      revalidatePath('/admin/settings');

      const claimSummary = [];
      if (result.claims_created > 0) {
        claimSummary.push(`${result.claims_created} created`);
      }
      if (result.claims_updated && result.claims_updated > 0) {
        claimSummary.push(`${result.claims_updated} updated`);
      }
      const claimText = claimSummary.length > 0 ? ` (${claimSummary.join(', ')})` : '';

      return {
        success: true,
        message: `Successfully processed ${result.users_filled} selected user(s) for ${formattedDate}${claimText}`,
        data: result,
      };
    }

    // Process all eligible users using the database function
    const { data, error } = await supabase.rpc('process_missing_claims', {
      p_target_date: formattedDate,
    });

    if (error) {
      console.error('Error running manual auto-claim:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`,
      };
    }

    if (!data || !data.success) {
      return {
        success: false,
        error: data?.message || 'Failed to process missing claims',
      };
    }

    revalidatePath('/admin/settings');

    return {
      success: true,
      message: `Successfully processed missing claims for ${formattedDate}`,
      data: data as ManualTriggerResult,
    };
  } catch (error) {
    console.error('Error running manual auto-claim:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run manual auto-claim',
    };
  }
}

/**
 * Reconciliation statistics result type
 */
interface ReconciliationStats {
  orphaned_leads: number;
  orphaned_claims: number;
  total_claimed_leads: number;
  total_claims: number;
}

/**
 * Reconciliation result type
 */
interface ReconciliationResult {
  total_orphaned_leads: number;
  total_orphaned_claims: number;
  leads_linked: number;
  claims_fixed: number;
  errors: string[];
}

/**
 * Get statistics on orphaned leads and claims
 */
export async function getReconciliationStatsAction(): Promise<ActionResult<ReconciliationStats>> {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/settings/reconcile-claims`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Failed to fetch reconciliation stats' };
    }

    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error fetching reconciliation stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch reconciliation statistics',
    };
  }
}

/**
 * Run claims reconciliation to link orphaned leads to their claims
 */
export async function runClaimsReconciliationAction(): Promise<ActionResult<ReconciliationResult>> {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return { success: false, error: 'Unauthorized. Admin access required.' };
    }

    const { createAdminClient } = await import('@/utils/supabase/server');
    const supabase = createAdminClient();

    const result: ReconciliationResult = {
      total_orphaned_leads: 0,
      total_orphaned_claims: 0,
      leads_linked: 0,
      claims_fixed: 0,
      errors: [],
    };

    // Step 1: Find all claimed leads that don't have entries in user_claim_leads
    const { data: claimedLeads, error: claimedError } = await supabase
      .from('leads')
      .select('id, claimed_by, claimed_at, created_at, type')
      .eq('status', 'claimed')
      .not('claimed_by', 'is', null);

    if (claimedError) {
      throw new Error(`Failed to fetch claimed leads: ${claimedError.message}`);
    }

    if (!claimedLeads || claimedLeads.length === 0) {
      return {
        success: true,
        message: 'No claimed leads found to reconcile',
        data: result,
      };
    }

    // Step 2: Check which leads already have junction entries
    const leadIds = claimedLeads.map(l => l.id);
    const BATCH_SIZE = 300;
    const existingLeadIds = new Set<string>();

    for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
      const batch = leadIds.slice(i, i + BATCH_SIZE);
      const { data: batchLinks, error: batchError } = await supabase
        .from('user_claim_leads')
        .select('lead_id')
        .in('lead_id', batch);

      if (batchError) {
        throw new Error(`Failed to fetch existing links (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${batchError.message}`);
      }

      batchLinks?.forEach(link => existingLeadIds.add(link.lead_id));
    }

    const orphanedLeads = claimedLeads.filter(l => !existingLeadIds.has(l.id));

    result.total_orphaned_leads = orphanedLeads.length;

    if (orphanedLeads.length === 0) {
      return {
        success: true,
        message: 'All claimed leads are already properly linked',
        data: result,
      };
    }

    // Step 3: Fix NULL claimed_at timestamps
    const leadsWithNullClaimedAt = orphanedLeads.filter(l => !l.claimed_at);
    if (leadsWithNullClaimedAt.length > 0) {
      for (const lead of leadsWithNullClaimedAt) {
        // Use created_at if available, otherwise use NOW()
        const claimedAt = lead.created_at || new Date().toISOString();

        const { error: updateError } = await supabase
          .from('leads')
          .update({ claimed_at: claimedAt })
          .eq('id', lead.id);

        if (updateError) {
          result.errors.push(`Failed to update claimed_at for lead ${lead.id}: ${updateError.message}`);
        } else {
          // Update local copy
          lead.claimed_at = claimedAt;
        }
      }
    }

    // Step 4: Group orphaned leads by claimed_by, type, and claim date
    interface LeadGroup {
      user_id: string;
      type: string;
      claim_date: string; // ISO date string (YYYY-MM-DD)
      leads: typeof orphanedLeads;
    }

    const groupMap = new Map<string, LeadGroup>();

    for (const lead of orphanedLeads) {
      if (!lead.claimed_by || !lead.claimed_at) continue;

      const claimDate = new Date(lead.claimed_at).toISOString().split('T')[0]; // YYYY-MM-DD
      const groupKey = `${lead.claimed_by}_${lead.type}_${claimDate}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          user_id: lead.claimed_by,
          type: lead.type,
          claim_date: claimDate,
          leads: [],
        });
      }

      groupMap.get(groupKey)!.leads.push(lead);
    }

    // Step 5: For each group, find or create user_claim
    for (const [groupKey, group] of groupMap.entries()) {
      // Find existing user_claim for this user+type+date
      const claimDateStart = new Date(group.claim_date + 'T00:00:00Z').toISOString();
      const claimDateEnd = new Date(group.claim_date + 'T23:59:59Z').toISOString();

      const { data: existingClaims, error: findError } = await supabase
        .from('user_claims')
        .select('id, lead_count, claimed_at')
        .eq('user_id', group.user_id)
        .eq('type', group.type)
        .gte('claimed_at', claimDateStart)
        .lte('claimed_at', claimDateEnd)
        .order('claimed_at', { ascending: true })
        .limit(1);

      if (findError) {
        result.errors.push(`Failed to find existing claim for ${groupKey}: ${findError.message}`);
        continue;
      }

      let claimId: string;
      let isNewClaim = false;

      if (existingClaims && existingClaims.length > 0) {
        // Use existing claim
        claimId = existingClaims[0].id;
      } else {
        // Create new user_claim
        const { data: newClaim, error: createError } = await supabase
          .from('user_claims')
          .insert({
            user_id: group.user_id,
            type: group.type,
            claimed_at: group.leads[0].claimed_at, // Use first lead's claimed_at
            lead_count: group.leads.length,
            source: 'manual',
          })
          .select('id')
          .single();

        if (createError) {
          result.errors.push(`Failed to create claim for ${groupKey}: ${createError.message}`);
          continue;
        }

        claimId = newClaim.id;
        isNewClaim = true;
        result.total_orphaned_claims++;
      }

      // Step 6: Link all leads in this group to the claim
      let linkedCount = 0;
      for (const lead of group.leads) {
        const { error: linkError } = await supabase
          .from('user_claim_leads')
          .insert({
            user_claim_id: claimId,
            lead_id: lead.id,
          });

        if (linkError) {
          result.errors.push(`Failed to link lead ${lead.id} to claim ${claimId}: ${linkError.message}`);
        } else {
          linkedCount++;
          result.leads_linked++;
        }
      }

      if (linkedCount > 0) {
        result.claims_fixed++;

        // Step 7: Update user_claims.lead_count if using existing claim
        if (!isNewClaim) {
          const { error: updateCountError } = await supabase.rpc('update_claim_lead_count', {
            claim_id: claimId,
          });

          if (updateCountError) {
            // Fallback: manually update lead_count
            const { data: countData } = await supabase
              .from('user_claim_leads')
              .select('id', { count: 'exact', head: true })
              .eq('user_claim_id', claimId);

            if (countData) {
              await supabase
                .from('user_claims')
                .update({ lead_count: linkedCount })
                .eq('id', claimId);
            }
          }
        }
      }
    }

    // Step 8: Clean up empty claims (claims with 0 linked leads)
    const { data: emptyClaims, error: emptyClaimsError } = await supabase
      .from('user_claims')
      .select('id')
      .eq('lead_count', 0);

    if (emptyClaims && emptyClaims.length > 0) {
      const emptyClaimIds = emptyClaims.map(c => c.id);
      const { error: deleteError } = await supabase
        .from('user_claims')
        .delete()
        .in('id', emptyClaimIds);

      if (deleteError) {
        result.errors.push(`Failed to delete empty claims: ${deleteError.message}`);
      }
    }

    // Log the reconciliation
    await supabase.from('system_logs').insert({
      event_type: 'claims_reconciliation',
      event_data: {
        admin_id: admin.user.id,
        result,
        timestamp: new Date().toISOString(),
      },
    });

    revalidatePath('/admin/settings');
    revalidatePath('/admin/users');

    return {
      success: true,
      message: `Reconciliation complete. Linked ${result.leads_linked} leads to ${result.claims_fixed} claims.`,
      data: result,
    };
  } catch (error) {
    console.error('Error reconciling claims:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reconcile claims',
    };
  }
}
