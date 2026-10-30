import { CalendarDays, Clock, ChevronRight, Phone, Home, Eye } from 'lucide-react';
import type { SiteSettings } from '@/lib/defaults';
import { formatDate, readingTime, POST_BASE } from '@/lib/utils';
import PostCard from '@/components/blocks/PostCard';
import SmartLink from '@/components/ui/SmartLink';
import { SocialIcon } from '@/components/ui/Icon';
import ShareButtons from './ShareButtons';
import ViewPing from './ViewPing';
import LeadForm from '@/components/blocks/LeadForm';
import T from '@/components/ui/T';
import { dirhamHtml } from '@/components/ui/Dirham';
import { safeArticleHtml } from '@/lib/sanitize';
import Particles from './Particles';

const strip = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** Q&A pairs from the article's FAQ section (<section class="post-faq"><h3>Q</h3><p>A</p>…) */
function faqFrom(html: string) {
  const sec = html.match(/<section class="post-faq">([\s\S]*?)<\/section>/);
  if (!sec) return [];
  return Array.from(sec[1].matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)).map((m) => ({ q: strip(m[1]), a: strip(m[2]) }));
}

const fmtViews = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k` : String(n));

export default function PostView({ post, related, site, lang = 'en-GB', url }: { post: any; related: any[]; site: SiteSettings; lang?: string; url?: string }) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const abs = (u?: string) => (!u ? undefined : /^https?:/.test(u) ? u : base + (u.startsWith('/') ? u : '/' + u));
  const text = strip(post.content || '');
  const faqs = faqFrom(post.content || '');
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: (post.title || '').slice(0, 110),
    description: post.metaDescription || post.excerpt || text.slice(0, 160),
    inLanguage: lang,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: url ? { '@type': 'WebPage', '@id': url } : undefined,
    url,
    image: abs(post.cover) ? [abs(post.cover)] : undefined,
    author: { '@type': 'Organization', name: site.name, url: base || undefined },
    publisher: { '@type': 'Organization', name: site.name, logo: abs(site.logo) ? { '@type': 'ImageObject', url: abs(site.logo) } : undefined },
    articleSection: post.category || undefined,
    keywords: post.tags || undefined,
    wordCount: text ? text.split(' ').length : undefined,
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: site.name, item: base ? base + '/' : undefined },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: base ? base + POST_BASE : undefined },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };
  const faqSchema = faqs.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) } : null;

  return (
    <article>
      <ViewPing id={post.id} />
      <header className="hero-stage theme-light pb-10 pt-[9.25rem] sm:pt-[9rem]">
        <div className="hero-aurora" />
        <div className="hero-grid" />
        <Particles density={0.3} />
        <div className="container-x relative max-w-6xl">
          <nav aria-label="Breadcrumb" className="fx-up flex flex-wrap items-center gap-1.5 text-[0.8rem] text-[#6e6e73]">
            <SmartLink href="/" className="inline-flex items-center gap-1 hover:text-black">
              <Home className="h-3.5 w-3.5" />
              <T>Home</T>
            </SmartLink>
            <ChevronRight className="h-3.5 w-3.5 opacity-50" />
            <SmartLink href={POST_BASE} className="hover:text-black">
              <T>Blog</T>
            </SmartLink>
            {post.category && (
              <>
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                <span className="text-[#1d1d1f]">{post.category}</span>
              </>
            )}
          </nav>
          <h1 className="h-display fx-blur mt-6 max-w-5xl text-[clamp(1.9rem,1.1rem+3vw,3.6rem)] [text-wrap:balance]" style={{ ['--d' as any]: '.08s' }}>
            {post.title}
          </h1>
          <p className="fx-up mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#6e6e73]" style={{ ['--d' as any]: '.18s' }}>
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-gold-deep" />
              <time dateTime={new Date(post.publishedAt).toISOString()}>{formatDate(post.publishedAt, { day: 'numeric', month: 'long', year: 'numeric' }, lang)}</time>
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gold-deep" /> {readingTime(post.content)} <T>min read</T>
            </span>
            <span className="flex items-center gap-2" title="Views">
              <Eye className="h-4 w-4 text-gold-deep" /> <span className="ltr tabular-nums">{fmtViews((post.views || 0) + 1)}</span>
            </span>
          </p>
        </div>
        {post.cover && (
          <div className="container-x fx-pop relative mt-10 max-w-6xl" style={{ ['--d' as any]: '.22s' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover} alt={post.title} className="aspect-[1536/816] h-auto w-full rounded-[28px] bg-[#f3efe4] object-contain shadow-[var(--shadow-lift)]" />
          </div>
        )}
      </header>

      <div className="container-x grid max-w-6xl gap-12 pb-20 pt-6 lg:grid-cols-[1fr_320px]">
        <div className="post-read min-w-0">
          {post.excerpt && <p className="mb-10 border-s-2 border-gold ps-5 text-[1.15rem] leading-relaxed text-[#3a3a3c]">{post.excerpt}</p>}
          <div className="rte" dangerouslySetInnerHTML={{ __html: dirhamHtml(safeArticleHtml(post.content)) }} />
          {post.tags && (
            <div className="mt-10 flex flex-wrap gap-2">
              {post.tags
                .split(',')
                .map((t: string) => t.trim())
                .filter(Boolean)
                .map((t: string) => (
                  <span key={t} className="pill">
                    #{t}
                  </span>
                ))}
            </div>
          )}
          <div className="mt-10 border-t border-black/[0.06] pt-6">
            <ShareButtons title={post.title} />
          </div>
        </div>

        {/* the assessment box scrolls with the page; the enquiry form then stays in view (and can scroll
            inside itself on short screens), so nothing is ever cut off — in any language */}
        <aside className="min-w-0 space-y-5">
          <div className="ink-panel theme-dark p-7 break-words">
            <p className="eyebrow">
              <T>Free assessment</T>
            </p>
            <h3 className="mt-3 font-display text-2xl font-semibold text-white">
              <T>Check your Golden Visa eligibility</T>
            </h3>
            <p className="mt-3 text-sm text-white/65">
              <T>A senior consultant reviews your profile and replies the same working day.</T>
            </p>
            <div className="mt-6 grid gap-2.5">
              <SmartLink href="whatsapp" className="btn btn-gold btn-sm">
                <SocialIcon name="whatsapp" className="h-4 w-4" /> <T>WhatsApp us</T>
              </SmartLink>
              <a href={`tel:${site.phone}`} className="btn btn-ghost-light btn-sm">
                <Phone className="h-4 w-4" /> <span className="ltr">{site.phoneDisplay}</span>
              </a>
            </div>
          </div>
          <div className="card break-words p-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <h3 className="font-display text-xl font-semibold">
              <T>Quick enquiry</T>
            </h3>
            <div className="mt-5">
              <LeadForm compact />
            </div>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="theme-sand section">
          <div className="container-x">
            <h2 className="h-section mb-10 text-center">
              <T>Keep reading</T>
            </h2>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs).replace(/</g, '\\u003c') }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, '\\u003c') }} />}
    </article>
  );
}
