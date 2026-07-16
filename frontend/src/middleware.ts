/**
 * middleware.ts — OrbeSystems Route Guardian
 * ════════════════════════════════════════════
 * Intercepta toda navegação ANTES do servidor renderizar a página.
 * Lê o JWT do cookie httpOnly e decodifica apenas o payload (sem
 * verificar assinatura — isso acontece no backend). Redireciona:
 *
 *   /ferramentas-premium/* → /login  (sem token)
 *   /ferramentas-premium/* → /assinar (token sem is_premium)
 *   /dashboard, /perfil   → /login  (sem token)
 *
 * PERFORMANCE: Zero consultas ao banco de dados por clique.
 * O role e is_premium já estão no payload do JWT.
 *
 * SECURITY NOTE [L2]: This middleware is a UX guard ONLY.
 * It decodes the JWT payload with atob() without verifying the HMAC
 * signature — signature verification happens on EVERY backend API call.
 * An attacker with a tampered token may see the HTML of a premium page,
 * but ALL data endpoints will return 401/403 from the backend.
 * The max-age sanity check below provides an additional layer of defence.
 */

import { NextRequest, NextResponse } from "next/server";

// ── Rotas protegidas por nível de acesso ─────────────────────────────────────
const PREMIUM_ROUTES = ["/ferramentas-premium", "/imortal"];
const AUTH_ROUTES = ["/dashboard", "/perfil"];
const LOGIN_PAGE = "/login";
const UPGRADE_PAGE = "/assinar";

export const TOKEN_COOKIE = "orbe_auth_token";

// ── JWT Payload ───────────────────────────────────────────────────────────────
interface JWTPayload {
  sub: string;        // email
  role: string;       // "user" | "premium"
  is_premium: boolean;
  exp: number;        // expiry (unix timestamp)
  iat?: number;       // issued-at (unix timestamp) — used for max-age check
}

function decodeJwtPayload(token: string): JWTPayload | null {
  try {
    const base64Payload = token.split(".")[1];
    // Replace base64url chars to standard base64 chars
    const base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    // decodeURIComponent/escape handles UTF-8 characters correctly
    const utf8Decoded = decodeURIComponent(escape(decoded));
    return JSON.parse(utf8Decoded) as JWTPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(payload: JWTPayload): boolean {
  const now = Date.now() / 1000;
  // Standard exp check
  if (now > payload.exp) return true;
  // [L2] Max-age sanity check: reject tokens older than 7 days even if exp is valid.
  // This limits the window for token replay attacks with a forged iat.
  const MAX_TOKEN_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days
  if (payload.iat && now - payload.iat > MAX_TOKEN_AGE_SECONDS) return true;
  return false;
}

// ── Middleware Logic ──────────────────────────────────────────────────────────
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPremiumRoute = PREMIUM_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Public route — let through immediately
  if (!isPremiumRoute && !isAuthRoute) return NextResponse.next();

  const token = request.cookies.get(TOKEN_COOKIE)?.value;

  // No token → redirect to login
  if (!token) {
    const loginUrl = new URL(LOGIN_PAGE, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = decodeJwtPayload(token);

  // Invalid token → redirect to login
  if (!payload) {
    const loginUrl = new URL(LOGIN_PAGE, request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Expired token → redirect to login with expired flag
  if (isTokenExpired(payload)) {
    const loginUrl = new URL(LOGIN_PAGE, request.url);
    loginUrl.searchParams.set("expired", "1");
    const response = NextResponse.redirect(loginUrl);
    // Clear the stale cookie
    response.cookies.delete(TOKEN_COOKIE);
    return response;
  }

  // Has token but no premium → redirect to upgrade page with source path
  if (isPremiumRoute && !payload.is_premium) {
    const upgradeUrl = new URL(UPGRADE_PAGE, request.url);
    upgradeUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(upgradeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/ferramentas-premium/:path*",
    "/imortal/:path*",
    "/dashboard/:path*",
    "/perfil/:path*",
  ],
};
