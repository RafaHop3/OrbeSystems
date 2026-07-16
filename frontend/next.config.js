/** @type {import('next').NextConfig} */

const securityHeaders = [
  // [M3] HSTS — force HTTPS for 1 year, include subdomains
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  // [M3] Clickjacking prevention
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // [M3] Prevent MIME-sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // [M3] Referrer — send origin only on cross-site requests
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // [M3] Disable unused browser features
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // [M3] Content Security Policy
  // - Scripts: self + Vercel live-feedback (dev) + inline nonces handled by Next.js
  // - Styles: self + Google Fonts
  // - Fonts: self + Google Fonts CDN
  // - Connect: self + /api/proxy/* (our own proxy) — backend domain is NOT listed
  // - Frame: none (matches X-Frame-Options: DENY)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://ipapi.co https://ipinfo.io",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;

