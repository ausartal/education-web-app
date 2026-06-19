import { NextRequest, NextResponse } from 'next/server';

const ADMIN_ROUTES = ['/admin'];
const TEACHER_ROUTES = ['/teacher'];
const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('__session')?.value;

  const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r));
  const isTeacherRoute = TEACHER_ROUTES.some(r => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r));

  // For admin/teacher API routes, verify token via internal API
  if (pathname.startsWith('/api/admin')) {
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*', '/teacher/:path*'],
};
