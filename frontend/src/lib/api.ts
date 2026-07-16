/**
 * lib/api.ts — URLs centralizadas da API
 * ════════════════════════════════════════
 * Duas URLs com propósitos distintos:
 *
 * API_BASE_URL  — Usada APENAS em Server Actions / Route Handlers (servidor).
 *                 Nunca é enviada ao bundle do cliente.
 *                 Em produção: configure NEXT_PUBLIC_API_URL no painel da Vercel.
 *
 * PROXY_BASE_URL — Usada em componentes cliente ('use client').
 *                  Aponta para o proxy Next.js local (/api/proxy).
 *                  O backend real NUNCA aparece no bundle JS ou no DevTools.
 *
 * Security: [A3] — Backend URL ocultada do cliente via proxy server-side.
 */

/** Server-side only. Used in Server Actions and Route Handlers. */
export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://orbe-systems-fuc5.vercel.app';

/**
 * Client-side safe. Routes all browser fetches through the Next.js
 * `/api/proxy` route handler — the real backend URL is never exposed.
 */
export const PROXY_BASE_URL = '/api/proxy';
