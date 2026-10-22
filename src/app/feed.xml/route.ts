import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { requestBaseUrl } from '@/lib/seo';
import { postPath } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// RSS feed of the latest blog posts - helps search engines and news readers find new posts quickly
export async function GET() {
  const base = await requestBaseUrl();
  const absUrl = (u: string) => (/^https?:\/\//.test(u) ? u : base + (u.startsWith('/') ? u : '/' + u));
  const [site, posts] = await Promise.all([
    getSetting('site'),
    prisma.post.findMany({ where: { status: 'published', publishedAt: { lte: new Date() } }, orderBy: { publishedAt: 'desc' }, take: 30 }).catch(() => []),
  ]);
  const items = posts
    .map((p) => {
      const url = `${base}${postPath(p.slug)}`;
      const desc = p.metaDescription || p.excerpt || p.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
      return `<item><title>${esc(p.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>${p.category ? `<category>${esc(p.category)}</category>` : ''}<description>${esc(desc)}</description>${p.cover ? `<enclosure url="${esc(absUrl(p.cover)!)}" type="image/jpeg" length="0"/>` : ''}</item>`;
    })
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(site.name)}</title><link>${base}/</link><description>${esc(site.seo.description || site.name)}</description><language>en</language><atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=600' } });
}
