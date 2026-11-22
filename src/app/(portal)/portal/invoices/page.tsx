import type { Metadata } from 'next';
import { ClientShell } from '@/adgv/components/dash/ClientShell';
import { Icon } from '@/adgv/components/Icon';
import { clientArea } from '@/adgv/lib/server/portal';
import { day, money } from '@/adgv/lib/stages';

export const metadata: Metadata = { title: 'Invoices & receipts' };
export const dynamic = 'force-dynamic';

/** Every payment request and receipt across the client's files: pay, download the receipt PDF. */
export default async function Invoices({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f = 'all' } = await searchParams;
  const area = await clientArea();
  const { base, t, mine, quotePay, live } = area;
  type Row = { key: string; ref: string; token: string; label: string; amount: number; at: string; paid: boolean; href: string; pdf?: string; no?: string; method?: string };
  const rows: Row[] = [];
  for (const a of mine) {
    for (const p of a.payments) rows.push({ key: p.id, ref: a.ref, token: a.token, label: p.label, amount: p.amount, at: p.paidAt || p.createdAt, paid: p.status === 'paid', href: `${base}/t/${a.token}/pay/${p.id}/`, pdf: p.status === 'paid' ? `${base}/t/${a.token}/receipt/${p.id}/pdf/` : undefined, no: p.receiptNo, method: p.method });
    const qp = quotePay(a);
    if (qp > 0) rows.push({ key: `q${a.id}`, ref: a.ref, token: a.token, label: `${a.route} · ${t.stQuotation}`, amount: qp, at: a.quote.sentAt || a.createdAt, paid: false, href: `${base}/t/${a.token}/${live ? 'pay/order/' : '#bank'}` });
  }
  rows.sort((x, y) => Number(x.paid) - Number(y.paid) || y.at.localeCompare(x.at));
  const shown = rows.filter((r) => f === 'all' || (f === 'paid' ? r.paid : !r.paid));
  const open = rows.filter((r) => !r.paid).reduce((s, r) => s + r.amount, 0), paid = rows.filter((r) => r.paid).reduce((s, r) => s + r.amount, 0);
  return (
    <ClientShell area={area} active="invoices" title={t.invoices} back={`${base}/invoices/`}>
      <div className="ph"><h2>{t.invoices}</h2><p className="muted">{t.dInvoices}</p></div>
      <div className="grid4 pk" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="kpi"><small>{t.amountDue}</small><b>{money(open)}</b></div>
        <div className="kpi"><small>{t.paidSoFar}</small><b>{money(paid)}</b></div>
      </div>
      <div className="ftabs" style={{ marginTop: 14 }}>{([['all', t.allStatus], ['due', t.due], ['paid', t.paid]] as const).map(([k, l]) => <a key={k} className={f === k ? 'on' : ''} href={`${base}/invoices/?f=${k}`}>{l}</a>)}</div>
      {shown.length === 0 ? <div className="emptyc"><Icon name="card" size={28} /><b>{t.noPayments}</b></div> : shown.map((r) => (
        <div key={r.key} className="orow">
          <a className="orow-a" href={r.paid && r.pdf ? r.pdf : `${base}/t/${r.token}/#payments`} target={r.paid ? '_blank' : undefined} rel="noopener">
            <span className={`ib${r.paid ? ' ok' : ''}`}><Icon name={r.paid ? 'check' : 'doc'} size={18} /></span>
            <span className="jr-m"><b>{r.paid ? r.no : r.ref}</b><small>{r.label}</small><small><Icon name="calendar" size={12} /> {day(r.at)}{r.method ? ` · ${r.method}` : ''}</small></span>
            <span className="orow-r"><b className={r.paid ? 'okc' : ''}>{money(r.amount)}</b><em className={`stc-pill ${r.paid ? 'st-done' : 'st-quote'}`}>{r.paid ? `✓ ${t.paid}` : t.due}</em></span>
          </a>
          {r.paid ? r.pdf && <a className="btn btn-sm orow-pay" href={r.pdf} target="_blank" rel="noopener"><Icon name="download" size={14} className="ei" /> {t.receipt} PDF</a> : <a className="btn btn-gold btn-sm orow-pay" href={r.href}><Icon name="card" size={14} className="ei" /> {t.payNow}</a>}
        </div>
      ))}
    </ClientShell>
  );
}
