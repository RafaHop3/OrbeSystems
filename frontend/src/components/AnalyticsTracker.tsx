'use client';

import { useEffect } from 'react';

/**
 * AnalyticsTracker: Invisible component that pings the backend on page load.
 * Placed in the RootLayout to capture all navigation events.
 *
 * Security [A3]: Uses relative /api/proxy path — backend URL never exposed to browser.
 */
export default function AnalyticsTracker() {
  useEffect(() => {
    const logVisit = async () => {
      try {
        // Relative URL — routes through Next.js proxy server-side.
        // The real backend URL (BACKEND_URL) never reaches the client bundle.
        await fetch('/api/proxy/api/analytics/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        // Silently fail to avoid impacting user experience
        console.warn('[ORBE_ANALYTICS] Signal lost - check connection.');
      }
    };

    // Stagger slightly to allow primary content to load first
    const timer = setTimeout(logVisit, 1500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
