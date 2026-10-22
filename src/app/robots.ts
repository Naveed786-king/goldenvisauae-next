import type { MetadataRoute } from 'next';
import { requestBaseUrl } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await requestBaseUrl();
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/api'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
