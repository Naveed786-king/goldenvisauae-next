import type { Metadata } from 'next';
import { PrintButton } from '@/adgv/components/dash/ActionForm';
import { ClientShell } from '@/adgv/components/dash/ClientShell';
import { clientArea } from '@/adgv/lib/server/portal';
import { SITE } from '@/adgv/lib/site';
import { money } from '@/adgv/lib/stages';
import { BRAND_DIR } from '@/adgv/lib/brand';

export const metadata: Metadata = { title: 'Account statement' };
export const dynamic = 'force-dynamic';
const d = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

/** All charges (accepted quotes / payment requests) and payments of a client, with a running balance. */
export default async function Statement({ searchParams }: { searchParams: Promise<{ y?: string }> }) {
  const { y = '' } = await searchParams;
  const area = await clientArea();
  const { base, me, t, mine } = area;
  type Row = { at: string; ref: string; text: string; debit: number; credit: number; link?: string; token: string };
  const rows: Row[] = [];
  for (const a of mine) for (const p of a.payments) {
    rows.push({ at: p.createdAt, ref: a.ref, text: p.label, debit: p.amount, credit: 0, token: a.token });
    if (p.status === 'paid') rows.push({ at: p.paidAt || p.createdAt, ref: a.ref, text: `${t.paid}: ${p.receiptNo} · ${p.method ?? ''}`, debit: 0, credit: p.amount, link: `${base}/t/${a.token}/receipt/${p.id}/pdf/`, token: a.token });
  }
  rows.sort((p1, p2) => p1.at.localeCompare(p2.at));
  const years = Array.from(new Set(rows.map((r) => r.at.slice(0, 4)))).sort().reverse();
  const inYear = (r: Row) => !y || r.at.startsWith(y);
  const opening = rows.filter((r) => y && r.at.slice(0, 4) < y).reduce((s2, r) => s2 + r.debit - r.credit, 0);
  let bal = opening;
  const lines = rows.filter(inYear).map((r) => { bal += r.debit - r.credit; return { ...r, bal }; });
  const debit = lines.reduce((s2, r) => s2 + r.debit, 0), credit = lines.reduce((s2, r) => s2 + r.credit, 0);
  return (
    <ClientShell area={area} active="statement" title={t.statement} back={`${base}/statement/`}>
      <div>
        <div className="ftabs noprint" style={{ marginBottom: 12 }}><a className={!y ? 'on' : ''} href="?">{t.allStatus}</a>{years.map((yy) => <a key={yy} className={y === yy ? 'on' : ''} href={`?y=${yy}`}>{yy}</a>)}</div>
        <div className="panel">
          <div className="panel-h">
            <div><p className="eyebrow">{t.statement}</p><h1 style={{ margin: '6px 0 2px' }}>{me.name}</h1><p className="muted small">{me.email} · {me.phone} · {d(new Date().toISOString())}</p></div>
            <img decoding="async" src={SITE.brand?.logo || `${BRAND_DIR}/logo.webp`} alt={SITE.name} style={{ height: 44, width: 'auto' }} />
          </div>
          <p className="muted small">{t.statementIntro}</p>
          <div className="grid4" style={{ margin: '14px 0' }}>
            <div className="kpi"><small>{t.total}</small><b>{money(debit)}</b></div>
            <div className="kpi"><small>{t.paidSoFar}</small><b>{money(credit)}</b></div>
            <div className="kpi goldbg"><small>{t.balance}</small><b>{money(bal)}</b></div>
            <div className="kpi"><small>{t.myFiles}</small><b>{mine.length}</b></div>
          </div>
          {!lines.length ? <p className="empty">{t.noPayments}</p> : (
            <div className="tbl-wrap"><table className="tbl stmt-tbl"><thead><tr><th>{t.date}</th><th>{t.orderNo}</th><th>{t.description}</th><th className="num">{t.amount}</th><th className="num">{t.paidSoFar}</th><th className="num">{t.balance}</th></tr></thead><tbody>
              {lines.map((r, i) => (
                <tr key={i}><td>{d(r.at)}</td><td><a href={`${base}/t/${r.token}/`}>{r.ref}</a></td><td>{r.text}{r.link && <> · <a className="noprint" href={r.link} target="_blank" rel="noopener">{t.receipt}</a></>}</td>
                  <td className="num">{r.debit ? r.debit.toFixed(2) : ''}</td><td className="num">{r.credit ? r.credit.toFixed(2) : ''}</td><td className="num"><b>{r.bal.toFixed(2)}</b></td></tr>))}
            </tbody></table></div>)}
          <p className="small muted" style={{ marginTop: 14 }}>{SITE.operator} · Trade Licence {SITE.licence} · {SITE.office} · {SITE.email}</p>
          <div className="row noprint" style={{ marginTop: 12 }}><PrintButton /><a className="btn" href={`${base}/`}>← {t.allOrders}</a></div>
        </div>
      </div>
    </ClientShell>
  );
}
