// List of client files as order cards with search and status tabs (Wordcraft "Orders" / "Translation jobs").
import { namesFor } from '@/adgv/lib/stage-defs';
import { Icon } from '../Icon';
import { filePct, fileStatus, fileTotal } from '@/adgv/lib/client-status';
import { money } from '@/adgv/lib/stages';
import type { ClientArea } from '@/adgv/lib/server/portal';

type Tab = 'all' | 'open' | 'quote' | 'prog' | 'done';
export function FileList({ area, path, q = '', tab = 'all', tabs = true, only, empty }: { area: ClientArea; path: string; q?: string; tab?: string; tabs?: boolean; only?: (k: string) => boolean; empty: string }) {
  const { base, t, mine, quotePay, live } = area;
  const n = q.trim().toLowerCase();
  const rows = mine.map((a) => ({ a, s: fileStatus(a, t) })).filter(({ a, s }) => (!only || only(s.key))
    && (!n || `${a.ref} ${a.route} ${a.quote.lines.map((l) => l.label).join(' ')}`.toLowerCase().includes(n))
    && (tab === 'all' || (tab === 'open' ? s.key !== 'done' : tab === 'prog' ? s.key === 'prog' || s.key === 'conf' : s.key === tab)));
  const TABS: [Tab, string][] = [['all', t.allStatus], ['open', t.open], ['quote', t.stQuotation], ['prog', t.inProgress], ['done', t.completed]];
  return (
    <>
      <form className="srch" action={`${base}${path}`}>
        <span><Icon name="search" size={16} /><input name="q" defaultValue={q} placeholder={t.searchOrders} aria-label={t.searchOrders} /></span>
        {tab !== 'all' && <input type="hidden" name="tab" value={tab} />}
        <button className="btn btn-dark" type="submit">{t.search}</button>
      </form>
      {tabs && <div className="ftabs">{TABS.map(([k, l]) => <a key={k} className={tab === k ? 'on' : ''} href={`${base}${path}?tab=${k}${q ? `&q=${encodeURIComponent(q)}` : ''}`}>{l}</a>)}</div>}
      {rows.length === 0 ? (
        <div className="emptyc"><Icon name="briefcase" size={28} /><b>{empty}</b><a className="btn" href={`${base}/services/`}><Icon name="plus" size={14} className="ei" /> {t.newRequest}</a></div>
      ) : rows.map(({ a, s }) => {
        const total = fileTotal(a), pct = filePct(a, namesFor(t, a).length), dueP = a.payments.find((p) => p.status === 'due'), qp = quotePay(a);
        return (
          <div key={a.id} className="orow">
            <a href={`${base}/t/${a.token}/`} className="orow-a">
              <span className="ring sm" style={{ ['--p' as string]: pct }}><i>{pct}%</i></span>
              <span className="jr-m"><b>{a.ref}</b><small>{a.route} · {namesFor(t, a)[a.stage]}</small><small><Icon name="calendar" size={12} /> {new Date(a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}{a.advisor?.name ? ` · ${a.advisor.name}` : ''}</small></span>
              <span className="orow-r"><b>{total ? money(total) : '—'}</b><em className={`stc-pill st-${s.key}`}>{s.label}</em></span>
            </a>
            {(dueP || qp > 0) && <a className="btn btn-gold btn-sm orow-pay" href={`${base}/t/${a.token}/${dueP ? `pay/${dueP.id}/` : live ? 'pay/order/' : '#bank'}`}><Icon name="card" size={14} className="ei" /> {dueP ? t.payNow : t.payConfirm} · {money(dueP ? dueP.amount : qp)}</a>}
          </div>
        );
      })}
    </>
  );
}
