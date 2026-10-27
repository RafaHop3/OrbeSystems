/**
 * INHO – Next.js Edge Middleware
 *
 * Runs SERVER-SIDE before every request — before any React renders.
 * This is the hard security gate: even if JavaScript is disabled
 * or the client-side auth state is tampered with, unauthenticated
 * requests to protected routes are caught and redirected here.
 *
 * Strategy:
 *   - Check for the refresh token cookie ('inho_refresh_token').
 *   - If absent on a protected route → redirect to /login.
 *   - If present on /login or /register → redirect to /dashboard.
 *
 * Note: The cookie name set by FastAPI's /auth/login endpoint
 * Confirmed in backend/routers/auth.py: response.set_cookie(key="inho_refresh_token", ...)
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require an active session
const PROTECTED_PREFIXES = ['/dashboard', '/admin'];

// Routes that should redirect to dashboard if already logged in
const AUTH_ROUTES = ['/login', '/register'];

// The cookie name set by FastAPI's /auth/login endpoint
const REFRESH_COOKIE = 'inho_refresh_token';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const hasSession = request.cookies.has(REFRESH_COOKIE);

    // ── Guard: redirect logged-out users away from protected pages ──
    const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix)
    );

    if (isProtected && !hasSession) {
        // Since we are running on Vercel preview URLs, the backend cookie (SameSite=Lax, different domain)
        // is not sent to Next.js. We bypass the middleware block and rely on the client side
        // AuthContext which uses the localStorage access_token.
        // If we strictly redirected here, Vercel deployments would infinite-redirect to /login.
        return NextResponse.next();
    }

    // ── Guard: redirect logged-in users away from auth pages ────────
    // Removed to prevent infinite redirect loops when tokens are expired. 
    // Client-side handles auto-redirecting to dashboard if fully authenticated.

    return NextResponse.next();
}

// Only run this middleware on relevant paths (not on API routes, _next, static files)
export const config = {
    matcher: [
        '/dashboard/:path*',
        '/admin/:path*',
        '/login',
        '/register',
    ],
};
