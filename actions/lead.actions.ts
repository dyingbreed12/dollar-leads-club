'use server';

import { leadService } from '@/services/lead.service';
import { createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { LeadStatus } from '@/types/lead.types';

interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export async function updateLeadAction(
  leadId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    // Get current lead
    const currentLead = await leadService.getLeadById(leadId);
    if (!currentLead) {
      return { success: false, error: 'Lead not found' };
    }

    // Extract form data
    const fullName = formData.get('full_name') as string;
    const streetAddress = formData.get('street_address') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const zipCode = formData.get('zip_code') as string;
    const phoneNumber = formData.get('phone_number') as string;
    const email = formData.get('email') as string;
    const propertyType = formData.get('property_type') as string;
    const leadGen = formData.get('lead_gen') as string;
    const status = formData.get('status') as LeadStatus;
    const marketStatus = formData.get('market_status') as string;
    const notes = formData.get('notes') as string;
    const claimedBy = formData.get('claimed_by') as string;

    // Parse numeric fields
    const estimate = parseFloat(formData.get('estimate') as string) || 0;
    const mao = parseFloat(formData.get('mao') as string) || 0;
    const offerPrice = parseFloat(formData.get('offer_price') as string) || 0;
    const avm = parseFloat(formData.get('avm') as string) || 0;
    const equity = parseFloat(formData.get('equity') as string) || 0;

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, error: 'Invalid email format' };
      }
    }

    // Build update object
    const updateData: Record<string, any> = {
      full_name: fullName || null,
      street_address: streetAddress || null,
      city: city || null,
      state: state || null,
      zip_code: zipCode || null,
      phone_number: phoneNumber || null,
      email: email || null,
      property_type: propertyType || null,
      lead_gen: leadGen || null,
      status: status || currentLead.status,
      market_status: marketStatus || null,
      notes: notes || null,
      estimate,
      mao,
      offer_price: offerPrice,
      avm,
      equity,
    };

    // Handle claimed_by assignment
    if (claimedBy && claimedBy !== '' && claimedBy !== '__unassigned__') {
      updateData.claimed_by = claimedBy;
      if (!currentLead.claimed_at) {
        updateData.claimed_at = new Date();
      }
      updateData.status = 'claimed';
    } else if ((claimedBy === '' || claimedBy === '__unassigned__') && currentLead.claimed_by) {
      // Unassign user
      updateData.claimed_by = null;
      updateData.claimed_at = null;
      if (updateData.status === 'claimed') {
        updateData.status = 'available';
      }
    }

    // Update the lead
    await leadService.updateLead(leadId, updateData);

    revalidatePath('/admin/dlc-leads');

    return { success: true, message: 'Lead updated successfully' };
  } catch (error) {
    console.error('Error updating lead:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update lead',
    };
  }
}

export async function deleteLeadAction(leadId: string): Promise<ActionResult> {
  try {
    // Get current lead to verify it exists
    const lead = await leadService.getLeadById(leadId);
    if (!lead) {
      return { success: false, error: 'Lead not found' };
    }

    // Delete related records first (cascade)
    const supabase = createAdminClient();

    // Delete from user_claim_leads if exists
    const { error: claimLeadsError } = await supabase
      .from('user_claim_leads')
      .delete()
      .eq('lead_id', leadId);

    if (claimLeadsError) {
      console.error('Error deleting user_claim_leads:', claimLeadsError);
      // Continue anyway as the table might not have this lead
    }

    // Delete the lead itself
    await leadService.deleteLead(leadId);

    revalidatePath('/admin/dlc-leads');

    return { success: true, message: 'Lead deleted successfully' };
  } catch (error) {
    console.error('Error deleting lead:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete lead',
    };
  }
}
