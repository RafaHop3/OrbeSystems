/**
 * lib/auth-actions.ts — OrbeSystems Server Actions
 * ══════════════════════════════════════════════════════
 * Server Actions for authentication. These can be called
 * from client components via the 'use server' directive.
 */

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TOKEN_COOKIE } from "./auth";
import type { AuthUser } from "./auth";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const rawUrl = process.env.NEXT_PUBLIC_API_URL ?? "https://orbe-systems-fuc5.vercel.app";
const API_URL = rawUrl.trim().replace(/\/$/, "");

// ── Cookie Management ─────────────────────────────────────────────────────────
async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE);
}

// ── Server Actions ────────────────────────────────────────────────────────────
export async function loginAction(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  try {
    const res = await fetch(`${API_URL}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.detail ?? "Login failed." };
    }

    const data = await res.json();
    await setAuthCookie(data.access_token);

    return {
      success: true,
      user: {
        email: data.user.email,
        role: data.user.role,
        is_premium: data.user.role === "premium",
      },
    };
  } catch {
    return { success: false, error: "Connection error. Try again." };
  }
}

export async function registerAction(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  try {
    const res = await fetch(`${API_URL}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.detail ?? "Registration failed." };
    }

    const data = await res.json();
    await setAuthCookie(data.access_token);

    return {
      success: true,
      user: {
        email: data.user.email,
        role: data.user.role,
        is_premium: data.user.role === "premium",
      },
    };
  } catch {
    return { success: false, error: "Connection error. Try again." };
  }
}

export async function logoutAction(): Promise<void> {
  await clearAuthCookie();
}

export async function createCheckoutSessionAction(): Promise<{ url?: string; error?: string }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE)?.value;

    if (!token) return { error: "unauthorized" };

    const res = await fetch(`${API_URL}/api/users/checkout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401) return { error: "unauthorized" };

    if (!res.ok) {
      const data = await res.json();
      return { error: data.detail ?? "Erro ao iniciar checkout." };
    }

    const data = await res.json();
    return { url: data.checkout_url };
  } catch {
    return { error: "Erro de conexão. Tente novamente." };
  }
}

export async function getMeAction(): Promise<{ user?: AuthUser; error?: string }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE)?.value;

    if (!token) return { error: "unauthorized" };

    const res = await fetch(`${API_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return { error: "unauthorized" };

    const data = await res.json();
    return { 
      user: {
        email: data.email,
        role: data.role,
        is_premium: data.role === "premium",
      }
    };
  } catch {
    return { error: "Connection error" };
  }
}

export async function passkeyLoginAction(
  emailOrCredentialId: string,
  isCredentialId = false
): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  try {
    const body = isCredentialId
      ? { credential_id: emailOrCredentialId }
      : { email: emailOrCredentialId };

    const res = await fetch(`${API_URL}/api/users/passkey-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.detail ?? "Passkey authentication failed." };
    }

    const data = await res.json();
    await setAuthCookie(data.access_token);

    return {
      success: true,
      user: {
        email: data.user.email,
        role: data.user.role,
        is_premium: data.user.role === "premium",
      },
    };
  } catch {
    return { success: false, error: "Connection error. Try again." };
  }
}

