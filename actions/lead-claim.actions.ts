'use server';

import { auth } from '@/auth';
import { leadClaimService } from '@/services/lead-claim.service';
import { LeadType } from '@/types/lead-batch.types';
import {
  ClaimEligibility,
  TodaysClaimData,
  ClaimHistoryItem,
  LeadResponseDTO,
} from '@/types/lead.types';
import { revalidatePath } from 'next/cache';

/**
 * Get claim eligibility for current user
 */
export async function getClaimEligibilityAction(
  type: LeadType
): Promise<{ success: boolean; data?: ClaimEligibility; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const eligibility = await leadClaimService.checkClaimEligibility(session.user.id, type);

    return {
      success: true,
      data: eligibility,
    };
  } catch (error) {
    console.error('Error checking eligibility:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check eligibility',
    };
  }
}

/**
 * Get next claim time for countdown
 */
export async function getNextClaimTimeAction(
  type: LeadType
): Promise<{
  success: boolean;
  data?: {
    nextClaimDate: Date;
    message: string;
    isWaitingForCronjob: boolean;
    hasUnviewedClaim: boolean;
  };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const result = await leadClaimService.getNextClaimTime(session.user.id, type);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error getting next claim time:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get next claim time',
    };
  }
}

/**
 * Get today's claimed leads for current user
 */
export async function getTodaysLeadsAction(
  type: LeadType
): Promise<{ success: boolean; data?: TodaysClaimData | null; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const todaysClaim = await leadClaimService.getTodaysClaimedLeads(session.user.id, type);

    return {
      success: true,
      data: todaysClaim,
    };
  } catch (error) {
    console.error('Error fetching today\'s leads:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch today\'s leads',
    };
  }
}

/**
 * Claim leads for current user
 */
export async function claimLeadsAction(
  type: LeadType
): Promise<{ success: boolean; data?: TodaysClaimData; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const claimResult = await leadClaimService.claimLeadsForUser(session.user.id, type);

    revalidatePath('/dashboard');

    return {
      success: true,
      data: claimResult,
    };
  } catch (error) {
    console.error('Error claiming leads:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to claim leads',
    };
  }
}

/**
 * Mark a claim as viewed
 */
export async function markClaimViewedAction(
  claimId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    await leadClaimService.markClaimAsViewed(claimId);

    revalidatePath('/dashboard');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error marking claim as viewed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark claim as viewed',
    };
  }
}

/**
 * Mark a claim as downloaded
 */
export async function markClaimDownloadedAction(
  claimId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    await leadClaimService.markClaimAsDownloaded(claimId);

    revalidatePath('/dashboard');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error marking claim as downloaded:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark claim as downloaded',
    };
  }
}

/**
 * Get claim history for current user
 */
export async function getClaimHistoryAction(
  type: LeadType
): Promise<{ success: boolean; data?: ClaimHistoryItem[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const history = await leadClaimService.getUserClaimHistory(session.user.id, type);

    return {
      success: true,
      data: history,
    };
  } catch (error) {
    console.error('Error fetching claim history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch claim history',
    };
  }
}

/**
 * Get leads for a specific claim (for download)
 */
export async function getClaimLeadsAction(
  claimId: string
): Promise<{ success: boolean; data?: LeadResponseDTO[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const leads = await leadClaimService.getLeadsByClaimId(claimId);

    return {
      success: true,
      data: leads,
    };
  } catch (error) {
    console.error('Error fetching claim leads:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch claim leads',
    };
  }
}

/**
 * Get all claimed leads for bulk download
 */
export async function getAllClaimedLeadsAction(
  type: LeadType
): Promise<{ success: boolean; data?: LeadResponseDTO[]; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const leads = await leadClaimService.getAllClaimedLeads(session.user.id, type);

    return {
      success: true,
      data: leads,
    };
  } catch (error) {
    console.error('Error fetching all claimed leads:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch all claimed leads',
    };
  }
}

/**
 * Get available lead count
 */
export async function getAvailableLeadCountAction(
  type: LeadType
): Promise<{ success: boolean; data?: number; error?: string }> {
  try {
    const count = await leadClaimService.getAvailableLeadCount(type);

    return {
      success: true,
      data: count,
    };
  } catch (error) {
    console.error('Error fetching available lead count:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch available lead count',
    };
  }
}
