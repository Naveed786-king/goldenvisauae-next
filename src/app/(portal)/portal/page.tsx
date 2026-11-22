import { namesFor } from '@/adgv/lib/stage-defs';
import type { Metadata } from 'next';
import { ClientShell } from '@/adgv/components/dash/ClientShell';
import { DeleteButton } from '@/adgv/components/dash/DeleteButton';
import { clearUpdates } from './actions';
import { Icon } from '@/adgv/components/Icon';
import { clientArea } from '@/adgv/lib/server/portal';
import { feed, filePct, fileStatus, freshCount } from '@/adgv/lib/client-status';
import { SITE, waLink } from '@/adgv/lib/site';
import { getPayCfg } from '@/adgv/lib/server/payments';
import { day, money } from '@/adgv/lib/stages';

export const metadata: Metadata = { title: 'My dashboard' };
export const dynamic = 'force-dynamic';

/** Client dashboard home: KPIs, quick actions, live files with progress rings, recent updates, balance. */
export default async function Home() {
  const area = await clientArea();
  const { base, me, t, mine, requests, live, quotePay } = area;
  const bankWa = (await getPayCfg()).bankWa;
  const cleared = area.me.updatesClearedAt || '';
  const items = feed(mine, t).filter((x) => x.kind === 'due' || !cleared || x.at > cleared);
  const dueAll = mine.flatMap((a) => a.payments).filter((p) => p.status === 'due').reduce((s, p) => s + p.amount, 0) + mine.reduce((s, a) => s + quotePay(a), 0);
  const paidAll = mine.flatMap((a) => a.payments).filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const st = mine.map((a) => fileStatus(a, t).key);
  const done = st.filter((k) => k === 'done').length;
  const quotes = st.filter((k) => k === 'quote').length;
  const docs = mine.reduce((n, a) => n + a.documents.filter((d) => d.by === 'team' && d.shared).length, 0);
  const dueN = mine.reduce((n, a) => n + a.payments.filter((p) => p.status === 'due').length + (quotePay(a) > 0 ? 1 : 0), 0);
  const firstPay = mine.find((a) => a.payments.some((p) => p.status === 'due') || quotePay(a) > 0);
  const firstDue = firstPay?.payments.find((x) => x.status === 'due');
  const payHref = firstPay ? `${base}/t/${firstPay.token}/${firstDue ? `pay/${firstDue.id}/` : live ? 'pay/order/' : '#bank'}` : `${base}/invoices/`;
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Dubai' }).format(new Date()));
  const greet = h < 12 ? t.goodMorning : h < 17 ? t.goodAfternoon : t.goodEvening;
  const active = mine.filter((_, i) => st[i] !== 'done');
  const KIND: Record<string, string> = { stage: 'check', paid: 'card', due: 'coins', quote: 'doc', msg: 'mail', doc: 'folder' };
  const all = [
    { href: '/services/', icon: 'plus', t: t.newRequest, d: t.dRequest },
    { href: '/orders/', icon: 'briefcase', t: t.orders, d: t.dOrders },
    { href: '/quotes/', icon: 'doc', t: t.quotations, d: t.dQuotes },
    { href: '/invoices/', icon: 'card', t: t.invoices, d: t.dInvoices },
    { href: '/statement/', icon: 'chart', t: t.statement, d: t.dStatement },
    { href: '/requests/', icon: 'inbox', t: t.myRequests, d: t.dRequests },
    { href: '/calendar/', icon: 'calendar', t: t.calendar, d: t.dCalendar },
    { href: '/account/', icon: 'user', t: t.profile, d: t.dProfile },
  ];

  return (
    <ClientShell area={area} active="home" title={t.home} updates={freshCount(items)}>
      <div className="dh">
        <div className="dh-l">
          <p className="muted" style={{ margin: 0 }}>{greet}</p>
          <h2 className="dh-name">{me.name}</h2>
          <div className="kt">
            <a href={`${base}/files/`}><b>{active.length}</b><small>{t.inProgress}</small></a>
            <a href={`${base}/files/`}><b>{done}</b><small>{t.completed}</small></a>
            <a href={`${base}/invoices/`}><b>{dueN}</b><small>{t.openPayments}</small></a>
            <a href={`${base}/files/`}><b><Icon name="folder" size={18} /> {mine.length}</b><small>{t.myFiles}</small>{active.length > 0 && <span className="pill ok">{t.live}</span>}</a>
            <a href={`${base}/quotes/`}><b><Icon name="doc" size={18} /> {quotes}</b><small>{t.quotations}</small></a>
            <a href={`${base}/files/`}><b><Icon name="download" size={18} /> {docs}</b><small>{t.docsShared}</small></a>
          </div>
          <div className="qt">
            <a href={`${base}/services/`}><Icon name="plus" size={20} />{t.newRequest}</a>
            <a href={payHref}><Icon name="card" size={20} />{t.payNow}</a>
            <a href={`${base}/statement/`}><Icon name="chart" size={20} />{t.statement}</a>
            <a href={`${base}/calendar/`}><Icon name="calendar" size={20} />{t.calendar}</a>
          </div>
        </div>
        <div className="dh-r">
          <div className="balc">
            <small>{dueAll > 0 ? t.toPayNow : t.paidWithUs}</small>
            <b>{money(dueAll > 0 ? dueAll : paidAll)}</b>
            <span>{dueAll > 0 ? `${dueN} × ${t.openPayments}` : `✓ ${t.allPaid}`}</span>
            <div className="row">
              {dueAll > 0 && <a className="btn btn-gold btn-sm" href={payHref}>{t.payNow}</a>}
              {dueAll > 0 && bankWa && <a className="btn btn-sm btn-wa" href={waLink(`Hello, I would like to pay ${money(dueAll)}${firstPay ? ` for my file ${firstPay.ref}` : ''} by bank transfer. Please send me your bank details.`)} target="_blank" rel="noopener" title="Pay by bank transfer">+ Bank transfer</a>}
              <a className="btn btn-sm balc-b" href={`${base}/statement/`}>{t.statement}</a>
            </div>
          </div>
          <div className="panel">
            <div className="panel-h"><h2>{t.myRequests}</h2><a className="small" href={`${base}/requests/`}>{t.allStatus} ›</a></div>
            {requests.length === 0 ? <p className="small muted" style={{ margin: '8px 0 0' }}>{t.nothingYet}</p> : requests.slice(0, 3).map((r) => (
              <div key={r.id} className="mini"><b>{r.service}</b><small>{day(r.at)} · {r.status === 'new' ? t.received : t.inProgress}</small></div>
            ))}
            <a className="btn btn-line btn-sm" style={{ marginTop: 10, width: '100%' }} href={`${base}/services/`}>+ {t.newRequest}</a>
          </div>
        </div>
      </div>

      <section className="dsec">
        <div className="panel-h"><p className="eyebrow">{t.liveFiles}</p><a className="small" href={`${base}/files/`}>{t.allFiles} ›</a></div>
        {active.length === 0 ? <p className="empty">{mine.length ? t.nothingYet : t.noFiles}</p> : active.slice(0, 5).map((a) => {
          const s = fileStatus(a, t), pct = filePct(a, namesFor(t, a).length), qp = quotePay(a), dueP = a.payments.find((p) => p.status === 'due');
          return (
            <a key={a.id} className="jrow" href={`${base}/t/${a.token}/`}>
              <span className="ring" style={{ ['--p' as string]: pct }}><i>{pct}%</i></span>
              <span className="jr-m"><b>{a.route}</b><small>{a.ref} · {t.step} {a.stage + 1} {t.of} {namesFor(t, a).length}: {namesFor(t, a)[a.stage]}</small>
                <span className="row" style={{ gap: 6, marginTop: 6 }}><em className={`stc-pill st-${s.key}`}>{s.label}</em>{a.expected && <em className="stc-pill">{t.expected} {a.expected}</em>}{(dueP || qp > 0) && <em className="stc-pill st-quote">{t.due}: {money(dueP ? dueP.amount : qp)}</em>}</span>
              </span>
              <Icon name="chev" size={18} />
            </a>
          );
        })}
      </section>

      <section className="dsec" id="updates">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="eyebrow" style={{ margin: 0 }}>{t.recentUpdates}</p>
          {items.some((x) => x.kind !== 'due') && <form action={clearUpdates}><DeleteButton label="Clear all" confirm="Clear all updates? Your files and documents stay as they are." className="btn btn-sm" /></form>}
        </div>
        {items.length === 0 ? <p className="empty">{t.nothingYet}</p> : (
          <div className="feed">
            {items.slice(0, 12).map((x, i) => (
              <a key={i} href={`${base}/t/${x.token}/`} className={`fd k-${x.kind}`}>
                <span className="fd-ic"><Icon name={KIND[x.kind]} size={16} /></span>
                <span className="fd-m"><b>{x.title}</b><small>{x.text}</small></span>
                <span className="fd-r">{x.amount ? <b>{money(x.amount)}</b> : null}<small>{day(x.at)}</small></span>
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="dsec">
        <p className="eyebrow">{t.everything}</p>
        <div className="allg">
          {all.map((x) => <a key={x.href} href={`${base}${x.href}`}><span><Icon name={x.icon} size={20} /></span><b>{x.t}</b><small>{x.d}</small></a>)}
        </div>
      </section>
      <p className="pfoot">{SITE.operator}</p>
    </ClientShell>
  );
}
