import { NextRequest, NextResponse } from 'next/server';

const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes handle their own auth via verifyAdmin (Bearer token in Authorization header).
  // Do not block them here — a missing __session cookie would incorrectly return 401
  // because Firebase client SDK stores tokens in localStorage/IndexedDB, not cookies.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Page-level guards are handled by AuthGuard + RoleGuard components.
  // Middleware only needs to pass through for all other routes.
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r));
  void isAuthRoute;

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/teacher/:path*'],
};
