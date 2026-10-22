// SEO helpers for multilingual pages and blog posts.
import { prisma } from './db';
import { safeJson } from './utils';
import { getSetting } from './settings';
import { LOCALES, DEFAULT_LOCALE, localizePath, localeInfo } from './i18n/config';

export function baseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/**
 * Site address for sitemap.xml / robots.txt / feed.xml.
 * Uses NEXT_PUBLIC_SITE_URL when set; otherwise the domain the request came in on
 * (e.g. https://goldenvisauae.ai), so Google never receives localhost links.
 */
export async function requestBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return baseUrl();
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const host = (h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].trim();
    if (host) {
      const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(host);
      const proto = local ? (h.get('x-forwarded-proto') || 'http').split(',')[0].trim() : 'https';
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  } catch {}
  return baseUrl();
}

export function absUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return baseUrl() + (pathOrUrl.startsWith('/') ? pathOrUrl : '/' + pathOrUrl);
}

/** Languages switched on in Admin → Languages */
export async function enabledLocales(): Promise<string[]> {
  const cfg = await getSetting('translation');
  const list = LOCALES.map((l) => l.code).filter((c) => c === DEFAULT_LOCALE || cfg.enabled.includes(c));
  return list.length ? list : [DEFAULT_LOCALE];
}

/**
 * Languages in which a blog post is really translated (not just showing the English text).
 * Only these are given to Google, so no language version is ever seen as duplicate content.
 */
export async function postLocales(postIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (!postIds.length) return out;
  const enabled = await enabledLocales();
  const [posts, rows] = await Promise.all([
    prisma.post.findMany({ where: { id: { in: postIds } }, select: { id: true, title: true, content: true } }),
    prisma.translation.findMany({ where: { entity: 'post', entityId: { in: postIds } }, select: { entityId: true, locale: true, data: true, status: true } }),
  ]);
  for (const p of posts) out.set(p.id, [DEFAULT_LOCALE]);
  const byId = new Map(posts.map((p) => [p.id, p]));
  for (const r of rows) {
    if (!enabled.includes(r.locale)) continue;
    const p = byId.get(r.entityId);
    if (!p) continue;
    const d = safeJson<any>(r.data, {});
    const translated = r.status === 'edited' || (d.title && d.title !== p.title) || (d.content && d.content !== p.content);
    if (translated) out.get(p.id)!.push(r.locale);
  }
  return out;
}

/** canonical + hreflang links for a path, limited to the given languages */
export function alternatesFor(path: string, locale: string, locales: string[]) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) if (locales.includes(l.code)) languages[l.htmlLang] = localizePath(path, l.code);
  languages['x-default'] = path;
  // a language that is not translated yet points Google to the English original
  const canonical = locales.includes(locale) ? localizePath(path, locale) : path;
  return { canonical, languages, types: { 'application/rss+xml': [{ url: '/feed.xml', title: 'Blog RSS' }] } };
}

export function ogLocale(code: string) {
  const l = localeInfo(code).htmlLang;
  const map: Record<string, string> = { en: 'en_GB', ar: 'ar_AE', ru: 'ru_RU', tr: 'tr_TR', 'zh-CN': 'zh_CN', fr: 'fr_FR', de: 'de_DE', es: 'es_ES', ro: 'ro_RO', hi: 'hi_IN' };
  return map[l] || l.replace('-', '_');
}
