'use client';

/**
 * INHO – AuthContext
 *
 * Provides global authentication state to the entire application.
 * On mount, attempts a silent token refresh using the HttpOnly cookie
 * to rehydrate the session after a page reload.
 */

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from 'react';
import { auth } from './auth';
import { authApi, usersApi, type UserMe, type LoginPayload } from './api';

// ── Context Shape ──────────────────────────────────────────────────
interface AuthContextValue {
    /** The authenticated user, or null if logged-out / loading */
    user: UserMe | null;
    /** True during the initial session rehydration on page load */
    isLoading: boolean;
    /** Call this after login to record the new token and load the user */
    login: (payload: LoginPayload) => Promise<UserMe | null>;
    /** Clears the token (memory + HttpOnly cookie via /auth/logout) */
    logout: () => Promise<void>;
    /** Re-fetches /users/me and updates the in-memory user state */
    refreshUser: () => Promise<UserMe | null>;
    /** The active business tenant ID */
    activeBusinessId: string | null;
    setActiveBusinessId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserMe | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [activeBusinessId, _setActiveBusinessId] = useState<string | null>(null);

    const setActiveBusinessId = useCallback((id: string | null) => {
        _setActiveBusinessId(id);
        if (id) {
            localStorage.setItem('@inho:biz', id);
        } else {
            localStorage.removeItem('@inho:biz');
        }
    }, []);

    /** Fetch the current user profile and store it in state */
    const refreshUser = useCallback(async () => {
        try {
            const me = await usersApi.me();
            setUser(me);
            // Auto inject business if operator
            if (me.role === 'operator' && (me as any).business_id) {
                setActiveBusinessId((me as any).business_id);
            }
            return me;
        } catch {
            setUser(null);
            return null;
        }
    }, [setActiveBusinessId]);

    /**
     * On mount: silently attempt a token refresh using the HttpOnly cookie.
     * If it succeeds, /users/me is called to rehydrate the user state.
     * This means a page refresh does NOT log the user out.
     */
    useEffect(() => {
        const rehydrate = async () => {
            setIsLoading(true);
            try {
                // Restore biz from localstorage if not an operator
                const storedBiz = localStorage.getItem('@inho:biz');
                if (storedBiz) _setActiveBusinessId(storedBiz);

                // Check if SSO token was passed via URL query parameters
                const params = new URLSearchParams(window.location.search);
                const ssoToken = params.get('token') || params.get('sso_token');

                if (ssoToken) {
                    auth.setAccessToken(ssoToken);
                    // Remove token parameter from URL without triggering a page reload
                    const cleanUrl = window.location.pathname;
                    window.history.replaceState({}, document.title, cleanUrl);
                    await refreshUser();
                    setIsLoading(false);
                    return;
                }

                // Skip background refresh request on public auth pages to prevent 401 console logs when not logged in
                const pathname = window.location.pathname;
                if (pathname === '/login' || pathname === '/register') {
                    setIsLoading(false);
                    return;
                }

                // Use valid persisted token before hitting /auth/refresh
                if (auth.getAccessToken() && !auth.isExpired()) {
                    await refreshUser();
                    setIsLoading(false);
                    return;
                }

                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL ?? 'https://inho-api.orbesystems.com.br'}/api/v1/auth/refresh`,
                    { method: 'POST', credentials: 'include' }
                );
                if (res.ok) {
                    const data = await res.json();
                    auth.setAccessToken(data.access_token);
                    await refreshUser();
                }
            } catch {
                // No valid refresh cookie or SSO token — user is simply not logged in
            } finally {
                setIsLoading(false);
            }
        };

        rehydrate();
    }, [refreshUser]);

    const login = useCallback(async (payload: LoginPayload) => {
        const data = await authApi.login(payload);
        auth.setAccessToken(data.access_token);
        // Refresh cookie is set by the backend in the Set-Cookie response header
        return await refreshUser();
    }, [refreshUser]);

    const logout = useCallback(async () => {
        try {
            await authApi.logout(); // clears the HttpOnly cookie server-side
        } catch {
            // ignore network errors on logout
        } finally {
            auth.clearAccessToken();
            setUser(null);
            setActiveBusinessId(null);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser, activeBusinessId, setActiveBusinessId }}>
            {children}
        </AuthContext.Provider>
    );
}

// ── Hook ───────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used inside <AuthProvider>');
    }
    return ctx;
}
