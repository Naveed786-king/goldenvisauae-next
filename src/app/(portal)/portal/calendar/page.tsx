import type { Metadata } from 'next';
import { ClientShell } from '@/adgv/components/dash/ClientShell';
import { Icon } from '@/adgv/components/Icon';
import { clientArea } from '@/adgv/lib/server/portal';
import { feed } from '@/adgv/lib/client-status';

export const metadata: Metadata = { title: 'Calendar' };
export const dynamic = 'force-dynamic';

/** Month view of progress dates, payments and quote deadlines. */
export default async function Calendar({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const area = await clientArea();
  const { base, t, mine } = area;
  const now = new Date();
  const [y, mo] = /^\d{4}-\d{2}$/.test(m ?? '') ? m!.split('-').map(Number) : [now.getFullYear(), now.getMonth() + 1];
  const first = new Date(Date.UTC(y, mo - 1, 1));
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  const key = (d: Date) => d.toISOString().slice(0, 10);
  const ev: Record<string, { text: string; kind: string; href: string }[]> = {};
  const add = (iso: string, text: string, kind: string, href: string) => { const k = iso.slice(0, 10); (ev[k] ??= []).push({ text, kind, href }); };
  for (const x of feed(mine, t)) if (x.kind !== 'msg') add(x.at, `${x.title}${x.kind === 'stage' ? '' : ` · ${x.ref}`}`, x.kind, `${base}/t/${x.token}/`);
  for (const a of mine) if (a.validUntil && a.quote.sentAt && !a.quote.acceptedAt) add(a.validUntil, `${t.validUntil} · ${a.ref}`, 'due', `${base}/t/${a.token}/`);
  const mk = (yy: number, mm: number) => { const d = new Date(Date.UTC(yy, mm - 1, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
  const today = key(now);
  const cells = Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, i) => new Date(Date.UTC(y, mo - 1, 1 - lead + i)));
  const WD = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }));
  return (
    <ClientShell area={area} active="calendar" title={t.calendar} back={`${base}/calendar/`}>
      <div className="panel cal">
        <div className="panel-h">
          <div><p className="eyebrow"><Icon name="calendar" size={14} /> {t.calendar}</p><h2 style={{ margin: '6px 0 2px' }}>{first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</h2><p className="small muted" style={{ margin: 0 }}>{t.calendarIntro}</p></div>
          <div className="row"><a className="btn btn-sm" href={`?m=${mk(y, mo - 1)}`} aria-label="Previous month">‹</a><a className="btn btn-sm" href="?">{t.today}</a><a className="btn btn-sm" href={`?m=${mk(y, mo + 1)}`} aria-label="Next month">›</a></div>
        </div>
        <div className="calg">
          {WD.map((d) => <b key={d} className="calh">{d}</b>)}
          {cells.map((d) => {
            const k = key(d), out = d.getUTCMonth() !== mo - 1;
            return (
              <div key={k} className={`calc${out ? ' out' : ''}${k === today ? ' now' : ''}`}>
                <span>{d.getUTCDate()}</span>
                {(ev[k] ?? []).slice(0, 3).map((e, i) => <a key={i} href={e.href} className={`cale k-${e.kind}`}>{e.text}</a>)}
                {(ev[k]?.length ?? 0) > 3 && <small>+{ev[k].length - 3}</small>}
              </div>
            );
          })}
        </div>
      </div>
    </ClientShell>
  );
}
