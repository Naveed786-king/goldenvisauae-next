import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage, getPost, getPosts } from '@/lib/data';
import { getLocalizedBundle } from '@/lib/settings';
import { getLocale } from '@/lib/i18n/server';
import { localeInfo, localizePath } from '@/lib/i18n/config';
import { postLocales, alternatesFor, absUrl, ogLocale, enabledLocales } from '@/lib/seo';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import PostView from '@/components/site/PostView';
import { stripHtml } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string[] }> };

async function resolve(slugParts: string[]) {
  const parts = slugParts.map(decodeURIComponent);
  const slug = parts.join('/');
  // blog articles: /blog/<post-slug>
  if (parts.length === 2 && parts[0] === 'blog') {
    const post = await getPost(parts[1]);
    if (post && post.status === 'published') return { kind: 'post' as const, post, slug };
  }
  const page = await getPage(slug);
  if (page && page.status === 'published' && slug !== 'home') return { kind: 'page' as const, page, slug };
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = await resolve(slug);
  if (!r) return { title: 'Page not found' };
  const locale = await getLocale();
  if (r.kind === 'page') {
    const locales = await enabledLocales();
    return {
      title: r.page.metaTitle ? { absolute: r.page.metaTitle } : r.page.title,
      description: r.page.metaDescription || undefined,
      alternates: alternatesFor(`/${r.slug}`, locale, locales),
      openGraph: {
        type: 'website',
        url: absUrl(localizePath(`/${r.slug}`, locale)),
        title: r.page.metaTitle || r.page.title,
        description: r.page.metaDescription || undefined,
        images: r.page.ogImage ? [absUrl(r.page.ogImage)!] : undefined,
        locale: ogLocale(locale),
        alternateLocale: locales.filter((l) => l !== locale).map(ogLocale),
      },
    };
  }
  const p = r.post;
  const desc = (p.metaDescription || p.excerpt || stripHtml(p.content)).replace(/\s+/g, ' ').trim().slice(0, 160);
  const locales = (await postLocales([p.id])).get(p.id) || ['en'];
  const ready = locales.includes(locale);
  const tags = (p.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
  const image = absUrl(p.cover);
  return {
    title: p.metaTitle ? { absolute: p.metaTitle } : p.title,
    description: desc,
    keywords: tags.length ? tags : undefined,
    alternates: alternatesFor(`/${r.slug}`, locale, locales),
    // a language that is not translated yet is not indexed (it would only repeat the English text)
    robots: ready ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } } : { index: false, follow: true },
    authors: p.author ? [{ name: p.author }] : undefined,
    openGraph: {
      type: 'article',
      url: absUrl(localizePath(`/${r.slug}`, locale)),
      title: p.metaTitle || p.title,
      description: desc,
      images: image ? [{ url: image, alt: p.title }] : undefined,
      publishedTime: new Date(p.publishedAt).toISOString(),
      modifiedTime: new Date(p.updatedAt).toISOString(),
      section: p.category || undefined,
      tags: tags.length ? tags : undefined,
      locale: ogLocale(locale),
      alternateLocale: locales.filter((l) => l !== locale).map(ogLocale),
    },
    twitter: { card: 'summary_large_image', title: p.metaTitle || p.title, description: desc, images: image ? [image] : undefined },
  };
}

export default async function CatchAll({ params }: Props) {
  const { slug } = await params;
  const r = await resolve(slug);
  if (!r) notFound();
  const locale = await getLocale();
  const { site } = await getLocalizedBundle(locale);
  if (r.kind === 'page') return <BlockRenderer blocks={r.page.blocks} site={site} />;
  const { items } = await getPosts({ take: 4 });
  const related = items.filter((x: any) => x.id !== r.post.id).slice(0, 3);
  return <PostView post={JSON.parse(JSON.stringify(r.post))} related={JSON.parse(JSON.stringify(related))} site={site} lang={localeInfo(locale).htmlLang} url={absUrl(localizePath(`/${r.slug}`, locale))} />;
}
