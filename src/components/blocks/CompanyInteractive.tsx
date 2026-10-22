'use client';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/components/site/SiteProvider';
import { withDirham } from '@/components/ui/Dirham';
import { cn } from '@/lib/utils';
import { Accordion } from './Interactive';

/* ------------------------------------------------------------------ office hours, live */
const DAY_SETS: Record<string, number[]> = {
  'mon-sat': [1, 2, 3, 4, 5, 6],
  'mon-fri': [1, 2, 3, 4, 5],
  'sun-thu': [0, 1, 2, 3, 4],
  'mon-sun': [0, 1, 2, 3, 4, 5, 6],
};
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Current weekday + minutes in a time zone (default Dubai) */
function zoneNow(tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const get = (k: string) => parts.find((p) => p.type === k)?.value || '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const h = Number(get('hour')) % 24;
  return { day, min: h * 60 + Number(get('minute')), hh: String(h).padStart(2, '0'), mm: get('minute') };
}
const toMin = (s: string, d: number) => {
  const m = String(s || '').match(/(\d{1,2})[:.](\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : d;
};
const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/**
 * "Open now · closes 18:00" / "Closed · opens Monday 09:00" with the live Dubai time.
 * Rendered on the client only (the server does not know the visitor's moment), so the
 * placeholder keeps the same height and nothing jumps.
 */
export function OpenNow({ days = 'mon-sat', from = '09:00', to = '18:00', tz = 'Asia/Dubai', className, dark }: { days?: string; from?: string; to?: string; tz?: string; className?: string; dark?: boolean }) {
  const t = useT();
  const [now, setNow] = useState<ReturnType<typeof zoneNow> | null>(null);
  useEffect(() => {
    const tick = () => setNow(zoneNow(tz));
    tick();
    const id = window.setInterval(tick, 20000);
    return () => window.clearInterval(id);
  }, [tz]);

  const set = DAY_SETS[days] || DAY_SETS['mon-sat'];
  const a = toMin(from, 540);
  const b = toMin(to, 1080);
  let status = '';
  let open = false;
  if (now) {
    open = set.includes(now.day) && now.min >= a && now.min < b;
    if (open) status = `${t('Open now')} · ${t('closes')} ${fmt(b)}`;
    else {
      let k = 0;
      let d = now.day;
      if (set.includes(d) && now.min < a) k = 0;
      else {
        do {
          d = (d + 1) % 7;
          k++;
        } while (!set.includes(d) && k < 8);
      }
      status = `${t('Closed')} · ${t('opens')} ${k === 0 ? t('today') : k === 1 ? t('tomorrow') : t(DAY_NAMES[d])} ${fmt(a)}`;
    }
  }
  return (
    <span className={cn('inline-flex min-h-[1.75rem] flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.82rem]', className)} aria-live="polite">
      <span className={cn('inline-flex items-center gap-2 rounded-full px-2.5 py-1 font-medium', !now ? 'opacity-0' : open ? 'bg-emerald-500/12 text-emerald-700' : 'bg-black/[0.05] text-[#6e6e73]', dark && now && (open ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/70'))}>
        <span className={cn('h-2 w-2 rounded-full', open ? 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.18)]' : 'bg-[#a1a1a6]')} style={open ? { animation: 'pulse-dot 1.6s ease-out infinite' } : undefined} />
        {status || '—'}
      </span>
      {now && (
        <span className={cn('ltr tabular-nums', dark ? 'text-white/55' : 'text-[#8e8e93]')}>
          {t('Dubai time')} {now.hh}:{now.mm}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ days since a date, live */
export function DaysSince({ date, className }: { date: string; className?: string }) {
  const start = useMemo(() => new Date(`${date}T00:00:00+04:00`).getTime(), [date]);
  const calc = () => Math.max(0, Math.floor((Date.now() - start) / 86400000));
  const [n, setN] = useState<number>(() => (Number.isFinite(start) ? calc() : 0));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(start)) return;
    const target = calc();
    setN(target);
    // count up once, then keep the number current (also past midnight)
    let raf = 0;
    const t0 = performance.now();
    const step = (tt: number) => {
      const p = Math.min(1, (tt - t0) / 1600);
      setShown(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const id = window.setInterval(() => setN(calc()), 60000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);
  return (
    <span className={cn('ltr tabular-nums', className)} suppressHydrationWarning>
      {(shown && shown < n ? shown : n).toLocaleString('en-US')}
    </span>
  );
}

/* ------------------------------------------------------------------ tabs (promise / mission / vision) */
export function Tabs3D({ items }: { items: { icon?: string; title: string; body: string }[] }) {
  const [i, setI] = useState(0);
  const [turn, setTurn] = useState(0);
  if (!items.length) return null;
  const cur = items[Math.min(i, items.length - 1)];
  return (
    <div>
      <div role="tablist" className="inline-flex max-w-full flex-wrap gap-1.5 rounded-2xl border border-black/[0.06] bg-white/70 p-1.5 shadow-[var(--shadow-soft)]">
        {items.map((it, k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === i}
            onClick={() => {
              if (k === i) return;
              setI(k);
              setTurn((x) => x + 1);
            }}
            className={cn('rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-200', k === i ? 'chip-active' : 'text-[#6e6e73] hover:bg-black/[0.04] hover:text-black')}
          >
            {it.title}
          </button>
        ))}
      </div>
      <div className="mt-6 [perspective:1200px]">
        <div key={turn} role="tabpanel" className="tab3d card tilt relative overflow-hidden p-7 sm:p-9" data-tilt="5">
          <span aria-hidden className="pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
          <span className="icon-chip depth-z">
            <Icon name={cur.icon || 'target'} className="h-5 w-5" />
          </span>
          <p className="mt-5 font-display text-xl font-semibold tracking-[-0.02em]">{cur.title}</p>
          <p className="lead mt-3 !text-[1.02rem]">{withDirham(cur.body)}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ FAQ with category filter */
export function FaqFilter({ items, tags, allLabel }: { items: { q: string; a: string; tag?: string }[]; tags: string[]; allLabel?: string }) {
  const t = useT();
  const [tag, setTag] = useState('');
  const list = tag ? items.filter((x) => (x.tag || '').trim() === tag) : items;
  return (
    <div>
      {tags.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2" role="tablist">
          {['', ...tags].map((x) => (
            <button
              key={x || 'all'}
              type="button"
              role="tab"
              aria-selected={tag === x}
              onClick={() => setTag(x)}
              className={cn('rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200', tag === x ? 'chip-active' : 'border-black/10 bg-white text-[#3a3a3c] hover:border-gold/60')}
            >
              {x || allLabel || t('All')}
            </button>
          ))}
        </div>
      )}
      <div key={tag} style={{ animation: 'pop .35s cubic-bezier(.2,.8,.2,1) both' }}>
        <Accordion items={list} first={false} />
      </div>
    </div>
  );
}
