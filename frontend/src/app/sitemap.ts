import type { MetadataRoute } from 'next';

const BASE = 'https://www.orbesystems.com.br';

// Rotas legadas (/automation, /database-architecture) ficam de fora de propósito:
// são servidas com X-Robots-Tag: noindex (ver next.config.js).
const routes = [
  '',
  '/ghost-engine',
  '/inho',
  '/orbe-cleaner',
  '/workspace',
  '/studio',
  '/youtube-mp3',
  '/assinar',
  '/mesh-social',
  '/privacidade',
  '/termos',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));
}
