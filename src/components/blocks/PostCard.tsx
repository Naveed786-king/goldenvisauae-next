'use client';
import SmartLink from '@/components/ui/SmartLink';
import T from '@/components/ui/T';
import { ArrowRight, Eye } from 'lucide-react';
import { cn, formatDate, readingTime, postPath } from '@/lib/utils';
import { useLocale } from '@/components/site/SiteProvider';
import { localeInfo } from '@/lib/i18n/config';
import { Coin } from '@/components/site/Logo';

export default function PostCard({ post, priority }: { post: any; dark?: boolean; priority?: boolean }) {
  const locale = useLocale();
  return (
    <SmartLink href={postPath(post.slug)} className={cn('card card-lift tilt group flex h-full flex-col overflow-hidden')}>
      <div className="relative aspect-[1536/816] overflow-hidden bg-[#f3efe4]">
        {post.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover} alt={post.title} loading={priority ? 'eager' : 'lazy'} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_20%,#fff8e4,#efe3c3)]">
            <Coin className="h-20 w-20 opacity-80" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {post.category && <span className="mb-2.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#8a6d2c]">{post.category}</span>}
        <h3 className="font-display text-[1.12rem] font-semibold leading-snug transition-colors group-hover:text-gold-deep">{post.title}</h3>
        {post.excerpt && <p className="muted mt-3 line-clamp-3 flex-1 text-sm leading-relaxed">{post.excerpt}</p>}
        <p className="muted mt-5 flex items-center justify-between gap-3 text-xs">
          <span>
            <time dateTime={new Date(post.publishedAt).toISOString()} suppressHydrationWarning>
              {formatDate(post.publishedAt, undefined, localeInfo(locale).htmlLang)}
            </time>{' '}
            · {readingTime(post.content)} <T>min read</T>
            {post.views > 0 && (
              <span className="ms-2 inline-flex items-center gap-1 align-middle" title="Views">
                <Eye className="h-3.5 w-3.5" />
                <span className="ltr tabular-nums">{post.views >= 1000 ? `${(post.views / 1000).toFixed(1).replace(/\.0$/, '')}k` : post.views}</span>
              </span>
            )}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-gold-deep transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
        </p>
      </div>
    </SmartLink>
  );
}
