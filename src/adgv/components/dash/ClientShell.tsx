// Client dashboard frame (Wordcraft / Odoo style): left menu in three groups (Track, Money, Requests),
// a top bar with the page title, WhatsApp, updates bell and profile. On phones the menu slides in.
import type { ReactNode } from 'react';
import { Icon } from '../Icon';
import { LangSelect } from './LangSelect';
import { logout, setLang } from '@/app/(portal)/portal/actions';
import { waLink } from '@/adgv/lib/site';
import type { ClientArea } from '@/adgv/lib/server/portal';
import { coinImg, fullLogo } from '@/adgv/components/BrandLogo';

export type NavKey = 'home' | 'files' | 'orders' | 'quotes' | 'invoices' | 'statement' | 'apply' | 'request' | 'requests' | 'calendar' | 'account';

export function ClientShell({ area, active, title, children, back, updates = 0 }: { area: Pick<ClientArea, 'base' | 'me' | 't' | 'lang' | 'mine'>; active: NavKey; title: string; children: ReactNode; back?: string; updates?: number }) {
  const { base, me, t, lang, mine } = area;
  const quotes = mine.filter((a) => a.quote.sentAt && !a.quote.acceptedAt && !a.payments.some((p) => p.status === 'paid')).length;
  const due = mine.reduce((n, a) => n + a.payments.filter((p) => p.status === 'due').length, 0);
  const L = (key: NavKey, href: string, icon: string, label: string, badge?: number) => (
    <a href={`${base}${href}`} className={active === key ? 'on' : ''} aria-current={active === key ? 'page' : undefined}>
      <Icon name={icon} size={17} /><span>{label}</span>{badge ? <em>{badge}</em> : null}
    </a>
  );
  return (
    <div className="cs">
      <input type="checkbox" id="cs-nav" className="cs-tg" aria-hidden="true" tabIndex={-1} autoComplete="off" suppressHydrationWarning />
      <aside className="cs-side" aria-label={t.menu}>
        <a className="cs-logo" href={`${base}/`}><img src={fullLogo()} alt="Abu Dhabi Golden Visa" /></a>
        <a className="btn btn-gold cs-new cs-new-app" href={`${base}/apply/`}><Icon name="plus" size={16} /> {t.newApp ?? 'New application'}</a>
        <nav>
          <p>{t.gTrack}</p>
          {L('home', '/', 'home', t.home)}
          {L('files', '/files/', 'folder', t.myFiles, mine.length || undefined)}
          {L('calendar', '/calendar/', 'calendar', t.calendar)}
          <p>{t.gMoney}</p>
          {L('orders', '/orders/', 'briefcase', t.orders)}
          {L('quotes', '/quotes/', 'doc', t.quotations, quotes || undefined)}
          {L('invoices', '/invoices/', 'card', t.invoices, due || undefined)}
          {L('statement', '/statement/', 'chart', t.statement)}
          <p>{t.gRequests}</p>
          {L('apply', '/apply/', 'folder', t.newApp ?? 'New application')}
          {L('request', '/services/', 'plus', t.newRequest)}
          {L('requests', '/requests/', 'inbox', t.myRequests)}
          <a href={waLink(`Hello, this is ${me.name}. `)} target="_blank" rel="noopener"><Icon name="wa" size={17} /><span>{t.whatsappUs}</span></a>
        </nav>
        <div className="cs-me">
          <span className="cs-av">{me.name.slice(0, 1).toUpperCase()}</span>
          <span><b>{me.name}</b><small>{me.email}</small></span>
        </div>
      </aside>
      <label htmlFor="cs-nav" className="cs-veil" aria-hidden="true" />
      <div className="cs-main">
        <header className="cs-top">
          <label htmlFor="cs-nav" className="cs-burger" aria-label={t.menu}><Icon name="menu" size={22} /></label>
          <h1>{title}</h1>
          <div className="cs-tools">
            <LangSelect action={setLang} current={lang.code} back={back ?? `${base}/`} label={t.language} />
            <a className="cs-ic" href={waLink(`Hello, this is ${me.name}. `)} target="_blank" rel="noopener" aria-label="WhatsApp"><Icon name="wa" size={18} /></a>
            <a className="cs-ic" href={`${base}/#updates`} aria-label={t.recentUpdates}><Icon name="bell" size={18} />{updates > 0 && <i>{updates > 9 ? '9+' : updates}</i>}</a>
            <details className="cs-prof">
              <summary className="cs-av" aria-label={t.profile}>{me.name.slice(0, 1).toUpperCase()}</summary>
              <div>
                <b>{me.name}</b><small>{me.email}</small>
                <a href={`${base}/account/`}>{t.profile}</a>
                <form action={logout}><button type="submit">{t.signOut}</button></form>
              </div>
            </details>
          </div>
        </header>
        <main className="cs-body">{children}</main>
      </div>
      <a className="cs-fab" href={waLink(`Hello, this is ${me.name}. `)} target="_blank" rel="noopener" aria-label="WhatsApp"><Icon name="wa" size={22} /></a>
    </div>
  );
}
