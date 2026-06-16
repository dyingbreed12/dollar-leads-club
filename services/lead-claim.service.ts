import { createAdminClient } from '@/utils/supabase/server';
import { userClaimRepository } from '@/repositories/user-claim.repository';
import { leadRepository } from '@/repositories/lead.repository';
import { userRepository } from '@/repositories/user.repository';
import {
  ClaimEligibility,
  TodaysClaimData,
  ClaimHistoryItem,
  LeadResponseDTO,
} from '@/types/lead.types';
import { LeadType } from '@/types/lead-batch.types';

/**
 * Lead Claim Service
 *
 * Orchestrates the lead claiming process, including eligibility checks,
 * claim creation, and retrieval of claimed leads.
 */
export class LeadClaimService {
  /**
   * Check if user can claim leads of a specific type
   */
  async checkClaimEligibility(userId: string, type: LeadType): Promise<ClaimEligibility> {
    const supabase = createAdminClient();

    // Get user's subscription info
    const user = await userRepository.findById(userId);
    if (!user) {
      return {
        canClaim: false,
        nextClaimDate: null,
        leadCount: 0,
        expectedLeadCount: 0,
        message: 'User not found',
      };
    }

    // Check subscription status
    if (user.subscription_status !== 'active') {
      return {
        canClaim: false,
        nextClaimDate: null,
        leadCount: 0,
        expectedLeadCount: 0,
        message: 'Your subscription is not active',
      };
    }

    // Check lead access
    if (!user.lead_access) {
      return {
        canClaim: false,
        nextClaimDate: null,
        leadCount: 0,
        expectedLeadCount: 0,
        message: 'Lead access is not enabled on your account',
      };
    }

    // Check if Diamond user trying to access Dollar leads (allowed)
    // Check if Dollar user trying to access Diamond leads (not allowed)
    if (type === 'diamond-lead' && user.subscription_plan !== 'diamond-lead') {
      return {
        canClaim: false,
        nextClaimDate: null,
        leadCount: 0,
        expectedLeadCount: 0,
        message: 'Diamond leads require a Diamond subscription',
      };
    }

    // Get lead count and schedule from settings
    const { data: settingsData } = await supabase
      .from('settings')
      .select('config')
      .eq('type', 'auto-claim')
      .single();

    let leadCount = 0;
    let weekdaysOnly = false;
    let utcHour = 8; // Default fallback

    if (settingsData?.config?.plans && user.subscription_plan) {
      const planConfig = settingsData.config.plans[user.subscription_plan];
      if (planConfig) {
        if (type === 'dollar-lead') {
          leadCount = planConfig.dollar_leads || 0;
        } else {
          leadCount = planConfig.diamond_leads || 0;
        }
        weekdaysOnly = planConfig.weekdays_only || false;
      }
    }

    // Extract UTC hour from settings schedule
    if (settingsData?.config?.schedule?.utc_hour !== undefined) {
      utcHour = settingsData.config.schedule.utc_hour;
    }

    // Default fallback if settings not found
    if (leadCount === 0) {
      if (type === 'dollar-lead') {
        leadCount = user.subscription_plan === 'diamond-lead' ? 10 : 5;
        weekdaysOnly = user.subscription_plan === 'dollar-lead';
      } else {
        leadCount = 2;
        weekdaysOnly = false;
      }
    }

    // Store expected lead count (configured for user's plan)
    const expectedLeadCount = leadCount;

    // Check weekday restriction (using UTC)
    const today = new Date();
    const dayOfWeek = today.getUTCDay(); // 0 = Sunday, 6 = Saturday (UTC)
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

    if (weekdaysOnly && !isWeekday) {
      const nextMonday = new Date(today);
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      nextMonday.setUTCDate(today.getUTCDate() + daysUntilMonday);
      nextMonday.setUTCHours(utcHour, 0, 0, 0);

      return {
        canClaim: false,
        nextClaimDate: nextMonday,
        leadCount: 0,
        expectedLeadCount,
        message: 'Dollar leads are only available on weekdays',
      };
    }

    // Check if already claimed today using database function
    const { data: canClaimData } = await supabase.rpc('can_user_claim_today', {
      p_user_id: userId,
      p_lead_type: type,
    });

    if (!canClaimData) {
      // Calculate next claim time based on settings (default tomorrow at configured UTC hour)
      const nextClaim = new Date();
      nextClaim.setUTCDate(nextClaim.getUTCDate() + 1);
      nextClaim.setUTCHours(utcHour, 0, 0, 0);

      return {
        canClaim: false,
        nextClaimDate: nextClaim,
        leadCount: 0,
        expectedLeadCount,
        message: "You've already claimed leads today",
      };
    }

    // Check available lead count
    const availableCount = await leadRepository.countAvailableByType(type);
    if (availableCount === 0) {
      return {
        canClaim: false,
        nextClaimDate: null,
        leadCount: 0,
        expectedLeadCount,
        message: 'No leads available in the pool',
      };
    }

    // Adjust lead count if not enough available
    const actualLeadCount = Math.min(leadCount, availableCount);

    return {
      canClaim: true,
      nextClaimDate: null,
      leadCount: actualLeadCount,
      expectedLeadCount,
      message: actualLeadCount < leadCount
        ? `Only ${actualLeadCount} leads available (normally ${leadCount})`
        : null,
    };
  }

  /**
   * Get next claim time for countdown display
   * Returns UTC Date - frontend will convert to user's timezone for display
   */
  async getNextClaimTime(
    userId: string,
    type: LeadType
  ): Promise<{
    nextClaimDate: Date;
    message: string;
    isWaitingForCronjob: boolean;
    hasUnviewedClaim: boolean;
  }> {
    const supabase = createAdminClient();

    // Get user info
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get settings
    const { data: settingsData } = await supabase
      .from('settings')
      .select('config')
      .eq('type', 'auto-claim')
      .single();

    const utcHour = settingsData?.config?.schedule?.utc_hour || 13;
    const planConfig = user.subscription_plan ? settingsData?.config?.plans?.[user.subscription_plan] : null;
    const weekdaysOnly = planConfig?.weekdays_only || false;

    // Check for unviewed claim
    const todaysClaim = await userClaimRepository.findTodaysClaim(userId, type);
    const hasUnviewedClaim = todaysClaim !== null && !todaysClaim.viewed;

    // Get last claim
    const lastClaim = await userClaimRepository.findLatestClaim(userId, type);

    // Calculate next claim time (UTC)
    const nowUTC = new Date();
    const todayCutoff = new Date();
    todayCutoff.setUTCHours(utcHour, 0, 0, 0);

    const alreadyClaimedToday = lastClaim && new Date(lastClaim.claimed_at) >= todayCutoff;

    let nextClaimDate: Date;
    let isWaitingForCronjob = false;

    if (alreadyClaimedToday) {
      // User already claimed today → Next claim is tomorrow
      nextClaimDate = new Date(todayCutoff);
      nextClaimDate.setUTCDate(nextClaimDate.getUTCDate() + 1);
    } else {
      // User hasn't claimed yet
      if (nowUTC < todayCutoff) {
        // Before cutoff → Next claim is today at utcHour
        nextClaimDate = todayCutoff;
        isWaitingForCronjob = true;
      } else {
        // After cutoff → Next claim is tomorrow at utcHour
        nextClaimDate = new Date(todayCutoff);
        nextClaimDate.setUTCDate(nextClaimDate.getUTCDate() + 1);
      }
    }

    // Handle weekday restrictions (skip to next weekday)
    if (weekdaysOnly) {
      let safety = 0;
      while (safety < 7) {
        const dayOfWeek = nextClaimDate.getUTCDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) break; // Monday-Friday
        nextClaimDate.setUTCDate(nextClaimDate.getUTCDate() + 1);
        safety++;
      }
    }

    // Generate message (backend returns UTC, frontend converts for display)
    const message = isWaitingForCronjob
      ? 'Leads will be automatically assigned soon'
      : "You've claimed today's leads";

    return {
      nextClaimDate,
      message,
      isWaitingForCronjob,
      hasUnviewedClaim,
    };
  }

  /**
   * Claim leads for a user using the database function
   */
  async claimLeadsForUser(userId: string, type: LeadType): Promise<TodaysClaimData> {
    const supabase = createAdminClient();

    // Check eligibility first
    const eligibility = await this.checkClaimEligibility(userId, type);
    if (!eligibility.canClaim) {
      throw new Error(eligibility.message || 'Cannot claim leads');
    }

    // Use the database function to create the claim
    const { data: claimId, error } = await supabase.rpc('create_user_claim', {
      p_user_id: userId,
      p_type: type,
      p_lead_count: eligibility.leadCount,
    });

    if (error || !claimId) {
      throw new Error(`Failed to create claim: ${error?.message || 'Unknown error'}`);
    }

    // Fetch the claim and its leads
    return this.getTodaysClaimWithLeads(userId, type);
  }

  /**
   * Get today's claimed leads if they exist
   */
  async getTodaysClaimedLeads(userId: string, type: LeadType): Promise<TodaysClaimData | null> {
    const claim = await userClaimRepository.findTodaysClaim(userId, type);

    if (!claim) {
      return null;
    }

    // Get the leads for this claim
    const leads = await this.getLeadsByClaimId(claim.id);

    return {
      claim: {
        id: claim.id,
        claimed_at: claim.claimed_at,
        lead_count: claim.lead_count,
        viewed: claim.viewed,
        downloaded: claim.downloaded,
        type: claim.type,
      },
      leads,
    };
  }

  /**
   * Get today's claim with leads (private helper)
   */
  private async getTodaysClaimWithLeads(userId: string, type: LeadType): Promise<TodaysClaimData> {
    const result = await this.getTodaysClaimedLeads(userId, type);

    if (!result) {
      throw new Error('Claim created but not found');
    }

    return result;
  }

  /**
   * Get leads for a specific claim
   */
  async getLeadsByClaimId(claimId: string): Promise<LeadResponseDTO[]> {
    const supabase = createAdminClient();

    // Get lead IDs from junction table
    const { data: junctionData, error: junctionError } = await supabase
      .from('user_claim_leads')
      .select('lead_id')
      .eq('user_claim_id', claimId);

    if (junctionError || !junctionData) {
      throw new Error(`Failed to get leads for claim: ${junctionError?.message}`);
    }

    if (junctionData.length === 0) {
      return [];
    }

    const leadIds = junctionData.map(item => item.lead_id);
    const leads = await leadRepository.findByIds(leadIds);

    return leads.map(lead => this.mapLeadToResponseDTO(lead));
  }

  /**
   * Get claim history for a user
   */
  async getUserClaimHistory(userId: string, type: LeadType): Promise<ClaimHistoryItem[]> {
    const claims = await userClaimRepository.findClaimHistory(userId, type);

    return claims.map(claim => ({
      id: claim.id,
      type: claim.type,
      claimed_at: claim.claimed_at,
      lead_count: claim.lead_count,
      viewed: claim.viewed,
      downloaded: claim.downloaded,
      source: claim.source,
    }));
  }

  /**
   * Mark a claim as viewed
   */
  async markClaimAsViewed(claimId: string): Promise<void> {
    const claim = await userClaimRepository.markAsViewed(claimId);
    if (!claim) {
      throw new Error('Failed to mark claim as viewed');
    }
  }

  /**
   * Mark a claim as downloaded
   */
  async markClaimAsDownloaded(claimId: string): Promise<void> {
    const claim = await userClaimRepository.markAsDownloaded(claimId);
    if (!claim) {
      throw new Error('Failed to mark claim as downloaded');
    }
  }

  /**
   * Get available lead count for a type
   */
  async getAvailableLeadCount(type: LeadType): Promise<number> {
    return leadRepository.countAvailableByType(type);
  }

  /**
   * Get all claimed leads for bulk download
   */
  async getAllClaimedLeads(userId: string, type: LeadType): Promise<LeadResponseDTO[]> {
    const claims = await userClaimRepository.findClaimHistory(userId, type);
    const allLeads: LeadResponseDTO[] = [];

    for (const claim of claims) {
      const leads = await this.getLeadsByClaimId(claim.id);
      allLeads.push(...leads);
    }

    return allLeads;
  }

  /**
   * Map Lead entity to LeadResponseDTO
   */
  private mapLeadToResponseDTO(lead: any): LeadResponseDTO {
    return {
      id: lead.id,
      lead_batch_id: lead.lead_batch_id,
      type: lead.type,
      status: lead.status,
      claimed_by: lead.claimed_by,
      claimed_at: lead.claimed_at,
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
      created_at: lead.created_at,
      updated_at: lead.updated_at,
    };
  }
}

// Export singleton instance
export const leadClaimService = new LeadClaimService();
