'use server';

import { waitingListService } from '@/services/waiting-list.service';
import { CreateWaitingListDTO } from '@/types/waiting-list-types';

interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
  data?: any;
}

export async function createWaitingListAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    // Extract form data
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const emailAddress = formData.get('emailAddress') as string;

    // Build create object
    const createData: CreateWaitingListDTO = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone_number: phoneNumber ? phoneNumber.trim() : null,
      email_address: emailAddress.trim(),
    };

    // Create the waiting list entry using the service
    const entry = await waitingListService.addToWaitingList(createData);

    return {
      success: true,
      message: 'Successfully added to waiting list',
      data: entry,
    };
  } catch (error) {
    console.error('Error creating waiting list entry:', error);

    // Handle specific error messages
    let errorMessage = 'Failed to add to waiting list';

    if (error instanceof Error) {
      // Check for specific validation errors
      if (error.message.includes('already on the waiting list')) {
        errorMessage = 'This email is already on the waiting list';
      } else if (error.message.includes('required')) {
        errorMessage = error.message;
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address';
      } else if (error.message.includes('characters')) {
        errorMessage = error.message;
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}