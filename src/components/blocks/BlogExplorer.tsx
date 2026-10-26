'use client';
import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import PostCard from './PostCard';
import { useT } from '@/components/site/SiteProvider';
import { cn } from '@/lib/utils';

type Item = { id: string; slug: string; title: string; excerpt?: string | null; category?: string | null; cat: string; tags?: string; [k: string]: any };
const PAGE = 9;
const norm = (s: string) => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** Blog listing with instant search, category tabs and counts — all client-side, no reloads */
export default function BlogExplorer({ items, flush }: { items: Item[]; flush?: boolean }) {
  const t = useT();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [limit, setLimit] = useState(PAGE);

  const cats = useMemo(() => {
    const m = new Map<string, { label: string; n: number }>();
    for (const p of items) {
      const c = m.get(p.cat) || { label: p.category || p.cat, n: 0 };
      c.n++;
      m.set(p.cat, c);
    }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [items]);

  const list = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return items.filter((p) => {
      if (cat !== 'all' && p.cat !== cat) return false;
      if (!words.length) return true;
      const hay = norm(`${p.title} ${p.excerpt || ''} ${p.category || ''} ${p.cat} ${p.tags || ''}`);
      return words.every((w) => hay.includes(w));
    });
  }, [items, q, cat]);

  const pick = (c: string) => {
    setCat(c);
    setLimit(PAGE);
  };

  return (
    <div className={flush ? '' : 'mt-10'}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <label className="relative block w-full md:max-w-md">
          <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder={t('Search articles')}
            aria-label={t('Search articles')}
            className="h-12 w-full rounded-full border border-black/10 bg-white/90 ps-11 pe-11 text-sm shadow-sm outline-none transition focus:border-[#c9a24a] focus:ring-4 focus:ring-[#c9a24a]/15"
          />
          {q && (
            <button type="button" onClick={() => setQ('')} aria-label={t('Clear')} className="absolute end-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-black/50 hover:bg-black/5">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <p className="muted text-sm" aria-live="polite">
          <span className="font-semibold text-[#141109] tabular-nums">{list.length}</span> {t('of')} <span className="tabular-nums">{items.length}</span> {t('articles')}
        </p>
      </div>

      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0" role="tablist" aria-label={t('Categories')}>
        {[['all', { label: t('All'), n: items.length }] as const, ...cats].map(([key, c]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={cat === key}
            onClick={() => pick(key)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
              cat === key ? 'border-transparent bg-[#141109] text-white shadow' : 'border-black/10 bg-white/80 text-[#3a3226] hover:border-[#c9a24a]/60 hover:bg-white',
            )}
          >
            {c.label}
            <span className={cn('rounded-full px-1.5 text-[0.7rem] tabular-nums', cat === key ? 'bg-white/15 text-[#e9cf8a]' : 'bg-black/[0.05] text-black/55')}>{c.n}</span>
          </button>
        ))}
      </div>

      {list.length ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {list.slice(0, limit).map((p, i) => (
            <div key={p.id} style={{ animation: `pop .45s cubic-bezier(.2,.8,.2,1) ${(i % PAGE) * 0.04}s both` }}>
              <PostCard post={p} priority={i < 3} />
            </div>
          ))}
        </div>
      ) : (
        <div className="card mt-8 p-10 text-center">
          <p className="font-display text-lg font-semibold">{t('No articles found')}</p>
          <button type="button" className="btn btn-outline btn-sm mt-4" onClick={() => { setQ(''); pick('all'); }}>
            {t('Show all articles')}
          </button>
        </div>
      )}

      {list.length > limit && (
        <div className="mt-12 text-center">
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="btn btn-dark">
            {t('Load more articles')} <span className="tabular-nums opacity-70">({list.length - limit})</span>
          </button>
        </div>
      )}
    </div>
  );
}
