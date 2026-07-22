'use client';

import { useEffect, useRef } from 'react';

/**
 * AnalyticsTracker: Invisible component that tracks visits and maintains session heartbeat.
 * Placed in the RootLayout to capture all navigation events.
 *
 * Features:
 * - Generates unique session ID for tracking active users
 * - Logs page visits with GeoIP data
 * - Sends periodic heartbeat to keep session active
 * - Tracks current page path
 *
 * Security [A3]: Uses relative /api/proxy path — backend URL never exposed to browser.
 */
export default function AnalyticsTracker() {
  const sessionIdRef = useRef<string>('');
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Generate or retrieve session ID
    const getOrCreateSessionId = () => {
      let sessionId = sessionStorage.getItem('orbe_session_id');
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem('orbe_session_id', sessionId);
      }
      return sessionId;
    };

    sessionIdRef.current = getOrCreateSessionId();

    const logVisit = async () => {
      try {
        const currentPath = window.location.pathname;
        await fetch('/api/proxy/api/analytics/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: currentPath,
            session_id: sessionIdRef.current,
            event_type: 'page_view'
          }),
        });
      } catch {
        console.warn('[ORBE_ANALYTICS] Signal lost - check connection.');
      }
    };

    const sendHeartbeat = async () => {
      try {
        const currentPath = window.location.pathname;
        await fetch('/api/proxy/api/analytics/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: currentPath,
            session_id: sessionIdRef.current,
            event_type: 'heartbeat'
          }),
        });
      } catch {
        // Silently fail - heartbeat failures shouldn't impact UX
      }
    };

    // Initial visit log
    const timer = setTimeout(logVisit, 1500);

    // Start heartbeat interval (every 30 seconds)
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);

    // Cleanup
    return () => {
      clearTimeout(timer);
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  // Track route changes for heartbeat updates
  useEffect(() => {
    const handleRouteChange = () => {
      if (sessionIdRef.current) {
        const currentPath = window.location.pathname;
        fetch('/api/proxy/api/analytics/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: currentPath,
            session_id: sessionIdRef.current,
            event_type: 'page_view'
          }),
        }).catch(() => {});
      }
    };

    // Listen for Next.js route changes
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  return null;
}
