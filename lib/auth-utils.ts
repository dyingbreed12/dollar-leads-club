import { Session } from "next-auth";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getImpersonationStatus } from "@/actions/impersonation.actions";

/**
 * Check if a user session has admin role
 */
export function isAdmin(session: Session | null): boolean {
  if (!session || !session.user) {
    return false;
  }
  return session.user.role === "admin";
}

/**
 * Check if a user session has regular user role
 */
export function isUser(session: Session | null): boolean {
  if (!session || !session.user) {
    return false;
  }
  return session.user.role === "user";
}

/**
 * Require admin role or redirect to admin login
 * Use in Server Components and Server Actions
 */
export async function requireAdmin(redirectTo: string = "/admin/login") {
  const session = await auth();

  if (!session || !isAdmin(session)) {
    redirect(redirectTo);
  }

  return session;
}

/**
 * Get admin session or return null
 * Use when you need to check admin status without redirecting
 */
export async function getAdminSession(): Promise<Session | null> {
  const session = await auth();

  if (!session || !isAdmin(session)) {
    return null;
  }

  return session;
}

/**
 * Require user role (non-admin) or redirect
 * Use to protect regular user routes from admin access
 * Allows admins who are impersonating users
 */
export async function requireUser(redirectTo: string = "/admin/dashboard") {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (isAdmin(session)) {
    // Check if admin is currently impersonating a user
    const impersonationStatus = await getImpersonationStatus();

    // If not impersonating, redirect to admin dashboard
    if (!impersonationStatus.isImpersonating) {
      redirect(redirectTo);
    }
    // If impersonating, allow them through as if they're a regular user
  }

  return session;
}

/**
 * Check if session exists (any role)
 */
export async function requireAuth(redirectTo: string = "/login") {
  const session = await auth();

  if (!session) {
    redirect(redirectTo);
  }

  return session;
}

/**
 * Get role from session
 */
export function getRole(session: Session | null): "admin" | "user" | null {
  if (!session || !session.user) {
    return null;
  }
  return session.user.role as "admin" | "user";
}
