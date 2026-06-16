'use server';

import { userService } from '@/services/user.service';
import { revalidatePath } from 'next/cache';

interface ActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export async function createAdminUser(formData: FormData): Promise<ActionResult> {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!name || !email || !password) {
      return { success: false, error: 'Name, email, and password are required' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Validate password strength
    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long' };
    }

    // Check if user already exists
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      return { success: false, error: 'A user with this email already exists' };
    }

    // Create the admin user
    await userService.registerUser({
      name,
      email,
      password,
      role: 'admin',
    });

    revalidatePath('/admin/users');

    return { success: true, message: 'Admin user created successfully' };
  } catch (error) {
    console.error('Error creating admin user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create admin user',
    };
  }
}

export async function updateAdminUser(
  userId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;

    if (!name || !email) {
      return { success: false, error: 'Name and email are required' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Get current user data
    const currentUser = await userService.getUserById(userId);
    if (!currentUser) {
      return { success: false, error: 'User not found' };
    }

    // Check if email is being changed and if new email already exists
    if (email !== currentUser.email) {
      const existingUser = await userService.getUserByEmail(email);
      if (existingUser) {
        return { success: false, error: 'A user with this email already exists' };
      }
    }

    // Update the user
    await userService.updateUserProfile(userId, {
      name,
      email,
    });

    revalidatePath('/admin/users');

    return { success: true, message: 'Admin user updated successfully' };
  } catch (error) {
    console.error('Error updating admin user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update admin user',
    };
  }
}

export async function deleteAdminUser(userId: string): Promise<ActionResult> {
  try {
    // Get user to verify they exist and are an admin
    const user = await userService.getUserById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.role !== 'admin') {
      return { success: false, error: 'User is not an admin' };
    }

    // Delete the user
    await userService.deleteUser(userId);

    revalidatePath('/admin/users');

    return { success: true, message: 'Admin user deleted successfully' };
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete admin user',
    };
  }
}
