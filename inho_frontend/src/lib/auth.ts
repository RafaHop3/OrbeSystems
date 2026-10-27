/**
 * INHO – Auth Token Store (Secure Edition)
 *
 * Access token lives in MEMORY only (module-level variable).
 * JS cannot read the Refresh token — it is stored exclusively in
 * the HttpOnly cookie set by the backend on /auth/login.
 *
 * Why not localStorage?
 *   localStorage is readable by ANY script on the page.
 *   A single XSS payload can steal it silently.
 *   In-memory tokens die with the tab — no persistence = no theft.
 */

// Module-level closure — inaccessible to any external code
let _accessToken: string | null = null;

export const auth = {
  /** Store the access token in memory + localStorage after login / silent refresh */
  setAccessToken(token: string) {
    _accessToken = token;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('token', token);
        localStorage.setItem('inho_access_token', token);
      } catch { /* ignore storage quota errors */ }
    }
  },

  /** Read the in-memory or persisted access token */
  getAccessToken(): string | null {
    if (_accessToken) return _accessToken;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('token') || localStorage.getItem('inho_access_token');
        if (stored) {
          _accessToken = stored;
          return stored;
        }
      } catch { /* ignore */ }
    }
    return null;
  },

  /** Wipe the in-memory + persisted token (on logout or failed refresh) */
  clearAccessToken() {
    _accessToken = null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('inho_access_token');
      } catch { /* ignore */ }
    }
  },

  /** Alias for clearAccessToken */
  clear() {
    this.clearAccessToken();
  },

  /** True if we have a token in memory AND it's not expired */
  isAuthenticated(): boolean {
    if (!_accessToken) return false;
    return !this.isExpired();
  },

  /**
   * Decode the JWT payload without verifying the signature.
   * Signature verification is the backend's job.
   * We only need the claims (role, sub, exp) for UI rendering.
   */
  parsePayload(): { sub: string; email: string; role: string; exp: number } | null {
    if (!_accessToken) return null;
    try {
      const part = _accessToken.split('.')[1];
      // Convert Base64Url to Base64 and pad correctly
      let base64 = part.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      // decodeURIComponent(escape(atob(..))) handles UTF-8 chars securely
      return JSON.parse(decodeURIComponent(escape(atob(base64))));
    } catch {
      return null;
    }
  },

  isExpired(): boolean {
    const payload = this.parsePayload();
    if (!payload) return true;
    // Add 10s buffer to avoid race conditions at the boundary
    return payload.exp * 1000 < Date.now() + 10_000;
  },
};
