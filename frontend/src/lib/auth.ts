/**
 * lib/auth.ts — OrbeSystems Auth Utilities
 * ══════════════════════════════════════════════════════
 * Client-side auth utilities. Server Actions are in auth-actions.ts.
 * The JWT is stored in an httpOnly cookie — never in localStorage.
 * This prevents XSS attacks from stealing tokens.
 *
 * Cookie name: orbe_auth_token
 * httpOnly: true  → JS cannot read it (XSS safe)
 * secure: true    → HTTPS only in production
 * sameSite: lax   → CSRF protection
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const TOKEN_COOKIE = "orbe_auth_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// ── Types ─────────────────────────────────────────────────────────────────────
export interface JWTPayload {
  sub: string;          // email
  role: "user" | "premium";
  is_premium: boolean;
  exp: number;
}

export interface AuthUser {
  email: string;
  role: "user" | "premium";
  is_premium: boolean;
}

// ── Token Decode (no signature verification — backend handles that) ────────────
function decodeJwtPayload(token: string): JWTPayload | null {
  try {
    const base64Payload = token.split(".")[1];
    const base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64);
    const utf8Decoded = decodeURIComponent(escape(decoded));
    return JSON.parse(utf8Decoded) as JWTPayload;
  } catch {
    return null;
  }
}

// ── Cookie Management ─────────────────────────────────────────────────────────
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE)?.value ?? null;
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE);
}

// ── Session ───────────────────────────────────────────────────────────────────
export async function getSession(): Promise<JWTPayload | null> {
  const token = await getAuthToken();
  if (!token) return null;

  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  // Check expiration
  if (Date.now() / 1000 > payload.exp) {
    await clearAuthCookie();
    return null;
  }

  return payload;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    email: session.sub,
    role: session.role,
    is_premium: session.is_premium,
  };
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null;
}

export async function isPremium(): Promise<boolean> {
  const session = await getSession();
  return session?.is_premium === true;
}

