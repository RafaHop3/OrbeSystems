/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';

// Strict Production CSP vs Development CSP
const connectSrc = [
  "'self'",
  "https://api.orbesystems.com.br",
  "https://inho-api.orbesystems.com.br",
  "https://ipapi.co",
  "https://ipinfo.io",
  "https://api.iconify.design",
  "https://api.unisvg.com",
  "https://api.simplesvg.com",
  ...(isDev ? ['http://localhost:8000', 'http://127.0.0.1:8000'] : [])
].join(' ');

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  "https://cdnjs.cloudflare.com",
  "https://code.iconify.design",
  "https://cdn.tailwindcss.com",
  ...(isDev ? ["https://vercel.live"] : [])
].join(' ');

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
    value: 'camera=(), microphone=(), geolocation=()',
  },
  // [M3] Content Security Policy (Hardened Red-Team Compliant)
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src ${scriptSrc}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: https://picsum.photos https://fastly.picsum.photos",
      `connect-src ${connectSrc}`,
      "frame-src 'self' data: blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const INHO_API_URL = "https://inho-api.orbesystems.com.br";
    const BACKEND_URL = "https://api.orbesystems.com.br";

    return [
      {
        source: '/remover-dados-:broker',
        destination: '/remover-dados/:broker',
      },
      // ---- INHO API EDGE REWRITES ----
      {
        source: '/api/proxy/api/v1/optout/:path*',
        destination: `${INHO_API_URL}/api/v1/optout/:path*`,
      },
      {
        source: '/api/proxy/api/v1/imortal/:path*',
        destination: `${INHO_API_URL}/api/v1/imortal/:path*`,
      },
      {
        source: '/api/proxy/api/v1/imobverse/:path*',
        destination: `${INHO_API_URL}/api/v1/imobverse/:path*`,
      },
      {
        source: '/api/proxy/api/v1/powershell-bot/:path*',
        destination: `${INHO_API_URL}/api/v1/powershell-bot/:path*`,
      },
      {
        source: '/api/proxy/api/v1/billing/:path*',
        destination: `${INHO_API_URL}/api/v1/billing/:path*`,
      },
      {
        source: '/api/proxy/api/v1/suite-inteligente/:path*',
        destination: `${INHO_API_URL}/api/v1/suite-inteligente/:path*`,
      },
      {
        source: '/api/proxy/api/v1/auth/:path*',
        destination: `${INHO_API_URL}/api/v1/auth/:path*`,
      },
      {
        source: '/api/proxy/api/v1/crm/:path*',
        destination: `${INHO_API_URL}/api/v1/crm/:path*`,
      },
      {
        source: '/api/proxy/api/v1/users/:path*',
        destination: `${INHO_API_URL}/api/v1/users/:path*`,
      },
      {
        source: '/api/proxy/api/v1/categories/:path*',
        destination: `${INHO_API_URL}/api/v1/categories/:path*`,
      },
      {
        source: '/api/proxy/api/v1/projects/:path*',
        destination: `${INHO_API_URL}/api/v1/projects/:path*`,
      },
      {
        source: '/api/proxy/api/v1/analytics/:path*',
        destination: `${INHO_API_URL}/api/v1/analytics/:path*`,
      },
      {
        source: '/api/proxy/api/v1/upload/:path*',
        destination: `${INHO_API_URL}/api/v1/upload/:path*`,
      },
      {
        source: '/api/proxy/api/v1/admin/:path*',
        destination: `${INHO_API_URL}/api/v1/admin/:path*`,
      },
      {
        source: '/api/proxy/api/v1/offline-agent/:path*',
        destination: `${INHO_API_URL}/api/v1/offline-agent/:path*`,
      },
      // ---- MAIN ORBE SYSTEMS DEFAULT BACKEND EDGE REWRITE ----
      {
        source: '/api/proxy/:path*',
        destination: `${BACKEND_URL}/:path*`,
      }
    ];
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.html$/,
      resourceQuery: /raw/,
      type: 'asset/source',
    });
    return config;
  },
};

module.exports = nextConfig;
