// Pieces of the client dashboard (server-rendered): progress ring, file row, status pill, update feed.
import Link from 'next/link';
import { ChevronRight, CheckCircle2, CreditCard, Coins, FileText, Mail, FolderDown } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { DashFile, Dashboard, FileKey, FeedKind } from '@/lib/portal/dashboard';
import type { TFunc } from '@/lib/i18n/server';

export const fmtMoney = (n: number, cur = 'AED') => `${cur} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const KEY_STYLE: Record<FileKey, { label: string; cls: string }> = {
  done: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-800' },
  closed: { label: 'Closed', cls: 'bg-zinc-100 text-zinc-600' },
  quote: { label: 'Quotation ready', cls: 'bg-gold/20 text-gold-deep' },
  pay: { label: 'Payment due', cls: 'bg-red-100 text-red-700' },
  msg: { label: 'New message', cls: 'bg-blue-100 text-blue-700' },
  progress: { label: 'In progress', cls: 'bg-ink text-white' },
};

export function KeyPill({ k, t }: { k: FileKey; t: TFunc }) {
  const s = KEY_STYLE[k];
  return <span className={cn('rounded-full px-2.5 py-0.5 text-[0.68rem] font-extrabold uppercase tracking-wide', s.cls)}>{t(s.label)}</span>;
}

export function Ring({ pct, size = 54 }: { pct: number; size?: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 54 54" width={size} height={size} className="-rotate-90">
        <circle cx="27" cy="27" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-ink/8" />
        <circle cx="27" cy="27" r={r} fill="none" stroke="url(#ringgold)" strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
        <defs>
          <linearGradient id="ringgold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e9cf8a" />
            <stop offset="1" stopColor="#b8862f" />
          </linearGradient>
        </defs>
      </svg>
      <i className="absolute text-[0.7rem] font-extrabold not-italic text-ink">{pct}%</i>
    </span>
  );
}

export function FileRow({ f, cur, t }: { f: DashFile; cur: string; t: TFunc }) {
  return (
    <Link href={`/account/applications/${f.id}`} className="group flex items-center gap-4 rounded-2xl border border-ink/5 bg-white p-4 transition hover:border-gold/50 hover:shadow-lg">
      <Ring pct={f.pct} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-ink">{f.service}</span>
        <span className="block truncate text-xs text-ink/55">
          {f.ref}
          {f.steps > 0 && f.key !== 'done' && ` · ${t('Step')} ${f.step} ${t('of')} ${f.steps}: ${f.stepName}`}
        </span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          <KeyPill k={f.key} t={t} />
          {f.due > 0 && f.key !== 'pay' && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[0.68rem] font-extrabold uppercase text-red-700">{fmtMoney(f.due, cur)}</span>}
          {f.unread > 0 && f.key !== 'msg' && <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[0.68rem] font-extrabold uppercase text-blue-700">{f.unread} {t('new message')}</span>}
          {f.expected && <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-[0.68rem] font-bold text-ink/60">{t('Expected')} {f.expected}</span>}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ink/30 transition group-hover:translate-x-1 group-hover:text-gold-deep" />
    </Link>
  );
}

const FEED_ICON: Record<FeedKind, any> = { stage: CheckCircle2, paid: CreditCard, due: Coins, quote: FileText, msg: Mail, doc: FolderDown };
const FEED_TONE: Record<FeedKind, string> = {
  stage: 'bg-emerald-50 text-emerald-700',
  paid: 'bg-emerald-50 text-emerald-700',
  due: 'bg-red-50 text-red-600',
  quote: 'bg-gold/15 text-gold-deep',
  msg: 'bg-blue-50 text-blue-700',
  doc: 'bg-ink/5 text-ink/70',
};

export function Feed({ items, cur, t }: { items: Dashboard['feed']; cur: string; t: TFunc }) {
  if (!items.length) return <p className="rounded-2xl bg-white p-6 text-sm text-ink/55 ring-1 ring-ink/5">{t('Nothing new yet. Updates on your files will show here.')}</p>;
  return (
    <div className="divide-y divide-ink/5 overflow-hidden rounded-2xl bg-white ring-1 ring-ink/5">
      {items.map((x, i) => {
        const Icon = FEED_ICON[x.kind];
        return (
          <Link key={i} href={x.kind === 'due' && x.href ? x.href : `/account/applications/${x.fileId}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-sand/60">
            <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', FEED_TONE[x.kind])}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-sm text-ink">{t(x.title)}</b>
              <small className="block truncate text-xs text-ink/55">{x.text}</small>
            </span>
            <span className="shrink-0 text-end">
              {x.amount ? <b className="block text-sm text-ink">{fmtMoney(x.amount, cur)}</b> : null}
              <small className="text-xs text-ink/45">{formatDate(x.at)}</small>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold text-ink md:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Empty({ text, cta }: { text: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] bg-white px-6 py-14 text-center ring-1 ring-ink/5">
      <p className="text-ink/60">{text}</p>
      {cta && <div className="mt-6">{cta}</div>}
    </div>
  );
}
