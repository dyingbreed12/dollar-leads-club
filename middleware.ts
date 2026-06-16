import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for NextAuth session cookie (supports both secure and non-secure variants)
  const sessionCookie = request.cookies.get('authjs.session-token') || request.cookies.get('__Secure-authjs.session-token');

  const hasSession = !!sessionCookie;

  // Admin routes - require authentication
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isAdminLoginRoute = pathname === '/admin/login';

  // User dashboard routes - require authentication
  const isUserDashboardRoute = pathname.startsWith('/dashboard');

  // Regular auth routes
  const authRoutes = ['/login', '/register'];
  const isAuthRoute = authRoutes.includes(pathname);

  // ==========================================
  // PROTECTED ROUTES (require authentication)
  // ==========================================

  // If accessing protected routes without session cookie, redirect to login
  if (isUserDashboardRoute && !hasSession) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // If accessing admin routes without session cookie, redirect to admin login
  if (isAdminRoute && !hasSession) {
    const url = new URL('/admin/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // ==========================================
  // AUTH ROUTES (handle in pages for role check)
  // ==========================================

  // Let auth pages handle the redirect logic based on actual session/role
  // This avoids async getToken() issues on Vercel

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
