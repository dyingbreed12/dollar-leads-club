'use server';

import { signIn, signOut, auth } from '@/auth';
import { userService } from '@/services/user.service';
import { AuthError } from 'next-auth';
import { revalidatePath } from 'next/cache';

/**
 * Server action to handle user login
 */
export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      success: false,
      error: 'Email and password are required',
    };
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    return {
      success: false,
      error: 'An error occurred. Please try again.',
    };
  }
}

/**
 * Server action to handle user registration
 */
export async function registerAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!name || !email || !password || !confirmPassword) {
    return {
      success: false,
      error: 'All fields are required',
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      error: 'Passwords do not match',
    };
  }

  try {
    await userService.registerUser({
      name,
      email,
      password,
    });

    return {
      success: true,
      message: 'Registration successful!',
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'An error occurred during registration. Please try again.',
    };
  }
}

/**
 * Server action to handle forgot password request
 */
export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    return {
      success: false,
      error: 'Email is required',
    };
  }

  try {
    await userService.requestPasswordReset(email);

    return {
      success: true,
      message: 'Password reset email sent. Please check your inbox.',
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'An error occurred. Please try again.',
    };
  }
}

/**
 * Server action to handle password reset
 */
export async function resetPasswordAction(token: string, formData: FormData) {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || !confirmPassword) {
    return {
      success: false,
      error: 'All fields are required',
    };
  }

  if (password !== confirmPassword) {
    return {
      success: false,
      error: 'Passwords do not match',
    };
  }

  try {
    await userService.resetPassword(token, password);

    return {
      success: true,
      message: 'Password reset successful! You can now login with your new password.',
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'An error occurred. Please try again.',
    };
  }
}

/**
 * Server action to handle user logout
 */
export async function logoutAction() {
  try {
    await signOut({
      redirect: false,
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: 'An error occurred during logout.',
    };
  }
}

/**
 * Server action to update user profile
 */
export async function updateProfileAction(userId: string, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  if (!name || !email) {
    return {
      success: false,
      error: 'Name and email are required',
    };
  }

  try {
    const updatedUser = await userService.updateUserProfile(userId, {
      name,
      email,
    });

    if (!updatedUser) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    revalidatePath('/dashboard/profile');
    revalidatePath('/admin/profile');

    return {
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'An error occurred. Please try again.',
    };
  }
}

/**
 * Server action to change user password
 */
export async function changePasswordAction(userId: string, formData: FormData) {
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return {
      success: false,
      error: 'All fields are required',
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      error: 'New passwords do not match',
    };
  }

  try {
    await userService.changePassword(userId, currentPassword, newPassword);

    revalidatePath('/dashboard/settings');
    revalidatePath('/admin/profile');

    return {
      success: true,
      message: 'Password changed successfully',
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'An error occurred. Please try again.',
    };
  }
}

/**
 * Server action to verify email
 */
export async function verifyEmailAction(token: string) {
  try {
    await userService.verifyEmail(token);

    return {
      success: true,
      message: 'Email verified successfully!',
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: 'Invalid or expired verification token.',
    };
  }
}

/**
 * Server action to handle admin login
 * Only allows users with admin role to log in
 */
export async function loginAdminAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      success: false,
      error: 'Email and password are required',
    };
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    // Check if user has admin role
    const session = await auth();

    if (!session || !session.user) {
      // Sign out and return error
      await signOut({ redirect: false });
      return {
        success: false,
        error: 'Authentication failed',
      };
    }

    if (session.user.role !== 'admin') {
      // User is not admin, sign them out
      await signOut({ redirect: false });
      return {
        success: false,
        error: 'Access denied. Admin privileges required.',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        error: 'Invalid email or password',
      };
    }

    return {
      success: false,
      error: 'An error occurred. Please try again.',
    };
  }
}

/**
 * Server action to start impersonating a user (admin only)
 */
export async function impersonateUserAction(userId: string) {
  try {
    const session = await auth();

    // Check if current user is admin
    if (!session || session.user.role !== 'admin') {
      return {
        success: false,
        error: 'Unauthorized. Admin access required.',
      };
    }

    // Get target user
    const targetUser = await userService.getUserById(userId);

    if (!targetUser) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // Prevent impersonating other admins
    if (targetUser.role === 'admin') {
      return {
        success: false,
        error: 'Cannot impersonate other administrators',
      };
    }

    // Store original admin info and impersonate target user
    // Note: This is a simplified implementation
    // In production, you'd want to store impersonation state in a database or session
    return {
      success: true,
      message: `Now impersonating ${targetUser.name}`,
      targetUser: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
      originalAdmin: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to impersonate user',
    };
  }
}

/**
 * Server action to stop impersonating and return to admin account
 */
export async function stopImpersonationAction() {
  try {
    const session = await auth();

    if (!session) {
      return {
        success: false,
        error: 'No active session',
      };
    }

    return {
      success: true,
      message: 'Impersonation ended',
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to stop impersonation',
    };
  }
}

/**
 * Server action to check if email exists in the database
 * Used during registration flow to show login form if user already exists
 */
export async function checkEmailExistsAction(email: string): Promise<{
  success: boolean;
  exists: boolean;
  error?: string;
  userData?: {
    email: string;
    name: string;
    subscriptionPlan?: string;
  };
}> {
  try {
    if (!email || !email.trim()) {
      return {
        success: false,
        exists: false,
        error: 'Email is required',
      };
    }

    // Check if email exists
    const user = await userService.getUserByEmail(email.trim());

    if (!user) {
      return {
        success: true,
        exists: false,
      };
    }

    // Return limited user data for login form
    return {
      success: true,
      exists: true,
      userData: {
        email: user.email,
        name: user.name,
        subscriptionPlan: user.subscription_plan || undefined,
      },
    };
  } catch (error) {
    console.error('Error in checkEmailExistsAction:', error);
    return {
      success: false,
      exists: false,
      error: 'An error occurred while checking email',
    };
  }
}
