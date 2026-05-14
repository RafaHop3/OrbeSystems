'use client';

import { useEffect } from 'react';

/**
 * AnalyticsTracker: Invisible component that pings the backend on page load.
 * Placed in the RootLayout to capture all navigation events.
 */
export default function AnalyticsTracker() {
  useEffect(() => {
    // Only run this on the client
    const logVisit = async () => {
      try {
        const rawUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://orbe-systems-api.onrender.com';
        const API_URL = rawUrl.trim().replace(/\/$/, '');
        
        // Fire-and-forget ping to the analytics endpoint
        await fetch(`${API_URL}/api/analytics/log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } catch (err) {
        // Silently fail to avoid impacting user experience
        console.warn("[ORBE_ANALYTICS] Signal lost - check connection.");
      }
    };

    // Stagger slightly to allow primary content to load first
    const timer = setTimeout(logVisit, 1500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
