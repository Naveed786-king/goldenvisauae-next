import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { LOCALES, localizePath } from '@/lib/i18n/config';
import { requestBaseUrl, enabledLocales, postLocales } from '@/lib/seo';
import { postPath } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// Every page in every language, with hreflang links between the language versions.
// Blog posts are listed only in the languages they are really translated into.
// The full list (every page × every language) takes seconds to build, and crawlers ask for it often:
// keep the built list for 10 minutes per site address. New posts appear within 10 minutes.
const SITEMAP_TTL = 10 * 60_000;
const memo = globalThis as unknown as { __sitemap?: Map<string, { at: number; data: MetadataRoute.Sitemap }> };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await requestBaseUrl();
  const cache = (memo.__sitemap ??= new Map());
  const hit = cache.get(base);
  if (hit && Date.now() - hit.at < SITEMAP_TTL) return hit.data;
  const data = await buildSitemap(base);
  if (data.length > 1) cache.set(base, { at: Date.now(), data }); // never keep the error fallback
  return data;
}

async function buildSitemap(base: string): Promise<MetadataRoute.Sitemap> {
  const abs = (u: string) => (/^https?:\/\//.test(u) ? u : base + (u.startsWith('/') ? u : '/' + u));
  try {
    const [pages, posts, langs] = await Promise.all([
      prisma.page.findMany({ where: { status: 'published' }, select: { slug: true, updatedAt: true, ogImage: true } }),
      prisma.post.findMany({ where: { status: 'published', publishedAt: { lte: new Date() } }, select: { id: true, slug: true, updatedAt: true, cover: true }, orderBy: { publishedAt: 'desc' } }),
      enabledLocales(),
    ]);
    const postLangs = await postLocales(posts.map((p) => p.id));
    const out: MetadataRoute.Sitemap = [];
    const entry = (path: string, locales: string[], lastModified: Date, priority: number, changeFrequency: 'daily' | 'weekly' | 'monthly', image?: string | null) => {
      const languages: Record<string, string> = {};
      for (const l of LOCALES) if (locales.includes(l.code)) languages[l.htmlLang] = encodeURI(base + localizePath(path, l.code));
      languages['x-default'] = encodeURI(base + path);
      for (const l of locales) {
        out.push({
          url: encodeURI(base + localizePath(path, l)),
          lastModified,
          changeFrequency,
          priority,
          alternates: { languages },
          ...(image ? { images: [abs(image)] } : {}),
        });
      }
    };
    for (const p of pages) {
      const path = p.slug === 'home' ? '/' : `/${p.slug}`;
      const legal = /privacy|terms/.test(p.slug);
      entry(path, langs, p.updatedAt, p.slug === 'home' ? 1 : legal ? 0.3 : 0.8, p.slug === 'home' || p.slug.includes('blog') || p.slug.includes('news') ? 'daily' : legal ? 'monthly' : 'weekly', p.ogImage);
    }
    for (const p of posts) entry(postPath(p.slug), postLangs.get(p.id) || ['en'], p.updatedAt, 0.7, 'weekly', p.cover);
    if (langs.length) entry('/apply', langs, new Date(), 0.6, 'monthly');
    return out;
  } catch {
    return [{ url: base }];
  }
}
