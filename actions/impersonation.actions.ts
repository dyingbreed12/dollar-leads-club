'use server';

import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { userService } from '@/services/user.service';
import { revalidatePath } from 'next/cache';

interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export async function startImpersonationAction(targetUserId: string): Promise<ActionResult> {
  try {
    const session = await auth();

    if (!session?.user) {
      return { success: false, error: 'You must be logged in' };
    }

    // Verify the current user is an admin
    if (session.user.role !== 'admin') {
      return { success: false, error: 'Only administrators can impersonate users' };
    }

    // Verify target user exists and is not an admin
    const targetUser = await userService.getUserById(targetUserId);
    if (!targetUser) {
      return { success: false, error: 'Target user not found' };
    }

    if (targetUser.role === 'admin') {
      return { success: false, error: 'Cannot impersonate another administrator' };
    }

    const cookieStore = await cookies();

    // Store impersonation state in cookies
    cookieStore.set('impersonation_target', targetUserId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour max impersonation
      path: '/',
    });

    cookieStore.set('impersonation_admin', session.user.id as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    });

    revalidatePath('/dashboard');

    return { success: true, message: 'Impersonation started' };
  } catch (error) {
    console.error('Error starting impersonation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start impersonation',
    };
  }
}

export async function stopImpersonationAction(): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();

    // Clear impersonation cookies
    cookieStore.delete('impersonation_target');
    cookieStore.delete('impersonation_admin');

    revalidatePath('/admin/users');

    return { success: true, message: 'Impersonation ended' };
  } catch (error) {
    console.error('Error stopping impersonation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to stop impersonation',
    };
  }
}

export async function getImpersonationStatus(): Promise<{
  isImpersonating: boolean;
  targetUserId?: string;
  adminUserId?: string;
}> {
  try {
    const cookieStore = await cookies();

    const targetCookie = cookieStore.get('impersonation_target');
    const adminCookie = cookieStore.get('impersonation_admin');

    if (targetCookie && adminCookie) {
      return {
        isImpersonating: true,
        targetUserId: targetCookie.value,
        adminUserId: adminCookie.value,
      };
    }

    return { isImpersonating: false };
  } catch {
    return { isImpersonating: false };
  }
}
