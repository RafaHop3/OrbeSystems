import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/', '/perfil'] }],
    sitemap: 'https://www.orbesystems.com.br/sitemap.xml',
  };
}
