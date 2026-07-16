/**
 * app/api/proxy/[...path]/route.ts — Secure Backend Reverse Proxy
 * ════════════════════════════════════════════════════════════════
 * All client-side API calls route through here instead of hitting
 * the backend URL directly. This prevents the real backend URL from
 * appearing in the browser's network tab or JS bundle.
 *
 * BACKEND_URL is a server-only env var (no NEXT_PUBLIC_ prefix).
 * It is never sent to the client.
 *
 * Security: [A3] Fix — backend URL no longer leaks to the browser.
 */

import { NextRequest, NextResponse } from 'next/server';

// Server-only: this string is NEVER bundled into client JS.
const BACKEND_URL = (
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    ''
).replace(/\/$/, '');

type Params = { params: Promise<{ path: string[] }> };

async function proxyRequest(request: NextRequest, { params }: Params): Promise<NextResponse> {
    const { path } = await params;
    const targetPath = path.join('/');

    // Preserve the original query string
    const searchParams = request.nextUrl.searchParams.toString();
    const qs = searchParams ? `?${searchParams}` : '';
    const targetUrl = `${BACKEND_URL}/${targetPath}${qs}`;

    // Forward only safe headers — strip host to avoid conflicts
    const forwardedHeaders: Record<string, string> = {};
    const allowedHeaders = ['authorization', 'content-type', 'accept', 'x-request-id'];
    request.headers.forEach((value, key) => {
        if (allowedHeaders.includes(key.toLowerCase())) {
            forwardedHeaders[key] = value;
        }
    });

    // Forward client IP for rate-limiting / audit logs on the backend
    const clientIp =
        request.headers.get('x-forwarded-for') ??
        request.headers.get('x-real-ip') ??
        '127.0.0.1';
    forwardedHeaders['x-forwarded-for'] = clientIp;

    try {
        const init: RequestInit = {
            method: request.method,
            headers: forwardedHeaders,
            // Only send body for non-GET/HEAD requests
            ...(request.method !== 'GET' && request.method !== 'HEAD'
                ? { body: await request.arrayBuffer() }
                : {}),
            // Do NOT cache proxy responses
            cache: 'no-store',
            // @ts-ignore — Next.js specific
            duplex: 'half',
        };

        const backendRes = await fetch(targetUrl, init);

        // Stream the response body back to the client
        const body = await backendRes.arrayBuffer();

        // Forward Content-Type from backend
        const responseHeaders = new Headers();
        const ct = backendRes.headers.get('content-type');
        if (ct) responseHeaders.set('content-type', ct);

        return new NextResponse(body, {
            status: backendRes.status,
            statusText: backendRes.statusText,
            headers: responseHeaders,
        });
    } catch (err: any) {
        console.error(`[Proxy] Error forwarding to ${targetUrl}:`, err.message);
        return NextResponse.json(
            { detail: 'Backend unreachable', error: err.message },
            { status: 502 }
        );
    }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const OPTIONS = proxyRequest;

// Force dynamic — never cache proxy routes
export const dynamic = 'force-dynamic';
