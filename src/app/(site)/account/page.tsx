import Link from 'next/link';
import { FilePlus, CreditCard, MessageCircle, Files, FolderOpen, FileText, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/lib/i18n/server';
import { getSetting } from '@/lib/settings';
import { loadDashboard } from '@/lib/portal/dashboard';
import AutoRefresh from '@/components/portal/AutoRefresh';
import { Feed, FileRow, fmtMoney } from '@/components/portal/DashParts';

/** Client dashboard home: greeting, counts, what to do now, live files, balance and latest updates. */
export default async function AccountPage() {
  const user = (await getCurrentUser())!;
  const [{ t }, d, site] = await Promise.all([getI18n(), loadDashboard(user.id), getSetting('site')]);
  const { totals, cur } = d;
  const h = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Dubai' }).format(new Date()));
  const greet = h < 12 ? t('Good morning') : h < 17 ? t('Good afternoon') : t('Good evening');

  const firstDue = d.files.flatMap((f) => f.payments).find((p) => p.status === 'due' && p.pay);
  const firstQuote = d.files.find((f) => f.key === 'quote');
  const firstMsg = d.files.find((f) => f.unread > 0);
  const todo = [
    firstQuote && { href: `/account/applications/${firstQuote.id}`, icon: FileText, title: t('Your quotation is ready'), text: `${firstQuote.service} · ${fmtMoney(firstQuote.quote!.total, cur)}`, cta: t('Review & accept') },
    firstDue && { href: firstDue.pay, icon: CreditCard, title: t('Payment due'), text: `${firstDue.label} · ${fmtMoney(firstDue.total, cur)}`, cta: t('Pay now') },
    firstMsg && { href: `/account/applications/${firstMsg.id}`, icon: MessageCircle, title: t('New message from your advisor'), text: `${firstMsg.ref} · ${firstMsg.service}`, cta: t('Read') },
  ].filter(Boolean) as { href: string; icon: any; title: string; text: string; cta: string }[];

  const kpis = [
    { href: '/account/applications', label: t('In progress'), value: totals.active, icon: Clock },
    { href: '/account/applications', label: t('Completed'), value: totals.done, icon: CheckCircle2 },
    { href: '/account/quotes', label: t('Quotations to accept'), value: totals.quotes, icon: FileText, hot: totals.quotes > 0 },
    { href: '/account/payments', label: t('Open payments'), value: totals.dueCount, icon: CreditCard, hot: totals.dueCount > 0 },
    { href: '/account/messages', label: t('Unread messages'), value: totals.unread, icon: MessageCircle, hot: totals.unread > 0 },
    { href: '/account/documents', label: t('Documents from us'), value: totals.docs, icon: Files },
  ];
  const all = [
    { href: '/apply', icon: FilePlus, title: t('New application'), text: t('Start another visa or service') },
    { href: '/account/applications', icon: FolderOpen, title: t('My applications'), text: t('Steps, progress and next step') },
    { href: '/account/quotes', icon: FileText, title: t('Quotations'), text: t('Review, download and accept') },
    { href: '/account/payments', icon: CreditCard, title: t('Payments & receipts'), text: t('Pay online, download receipts') },
    { href: '/account/documents', icon: Files, title: t('Documents'), text: t('Everything you sent and we shared') },
    { href: '/account/messages', icon: MessageCircle, title: t('Messages'), text: t('Talk to your advisor') },
  ];

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={30} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="ink-panel theme-dark rounded-[2rem] p-6 md:p-8">
          <p className="text-sm text-white/60">{greet}</p>
          <h1 className="font-display text-3xl font-semibold text-white md:text-4xl">{user.name}</h1>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {kpis.map((k) => (
              <Link key={k.label} href={k.href} className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 transition hover:bg-white/10">
                <span className="flex items-center justify-between">
                  <b className="font-display text-3xl font-semibold text-white">{k.value}</b>
                  <k.icon className={k.hot ? 'h-5 w-5 text-gold' : 'h-5 w-5 text-white/35'} />
                </span>
                <small className="mt-1 block text-xs font-bold uppercase tracking-wider text-white/55">{k.label}</small>
              </Link>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/apply" className="btn btn-gold btn-sm"><FilePlus className="h-4 w-4" /> {t('New application')}</Link>
            {firstDue && <Link href={firstDue.pay} className="btn btn-sm bg-white text-ink"><CreditCard className="h-4 w-4" /> {t('Pay now')}</Link>}
            <Link href="/account/messages" className="btn btn-sm bg-white/10 text-white"><MessageCircle className="h-4 w-4" /> {t('Messages')}</Link>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[2rem] p-6 text-[#1a1406]" style={{ background: 'var(--gold-grad)' }}>
            <small className="text-xs font-bold uppercase tracking-wider opacity-70">{totals.due > 0 ? t('To pay now') : t('Paid with us')}</small>
            <b className="mt-1 block font-display text-3xl font-semibold">{fmtMoney(totals.due > 0 ? totals.due : totals.paid, cur)}</b>
            <span className="text-sm opacity-75">{totals.due > 0 ? `${totals.dueCount} ${t('open payments')}` : `✓ ${t('All paid')}`}</span>
            <div className="mt-4 flex flex-wrap gap-2">
              {firstDue && <Link href={firstDue.pay} className="btn btn-sm bg-ink text-white">{t('Pay now')}</Link>}
              <Link href="/account/payments" className="btn btn-sm bg-white/60 text-ink">{t('Payments & receipts')}</Link>
            </div>
          </div>
          <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-[2rem] bg-white p-5 ring-1 ring-ink/5 transition hover:ring-gold/40">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><MessageCircle className="h-5 w-5" /></span>
            <span className="text-sm">
              <b className="block text-ink">{t('Questions? WhatsApp us')}</b>
              <span className="text-ink/55">{site.hours}</span>
            </span>
          </a>
        </div>
      </div>

      {todo.length > 0 && (
        <section>
          <p className="eyebrow mb-3">{t('What to do now')}</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {todo.map((x) => (
              <Link key={x.title} href={x.href} className="group flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-gold/40 transition hover:shadow-lg">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gold/15 text-gold-deep"><x.icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm text-ink">{x.title}</b>
                  <small className="block truncate text-xs text-ink/55">{x.text}</small>
                </span>
                <span className="shrink-0 text-xs font-extrabold text-gold-deep">{x.cta} →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow">{t('Live files')}</p>
          <Link href="/account/applications" className="text-sm font-bold text-gold-deep">{t('All applications')} ›</Link>
        </div>
        {d.open.length === 0 ? (
          <div className="rounded-[2rem] bg-white px-6 py-12 text-center ring-1 ring-ink/5">
            <p className="text-ink/60">{d.files.length ? t('All your files are finished. Need something else?') : t('You have not submitted any applications yet.')}</p>
            <Link href="/apply" className="btn btn-gold mt-6">{t('Start your Golden Visa application')} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <div className="grid gap-3">{d.open.slice(0, 6).map((f) => <FileRow key={f.id} f={f} cur={cur} t={t} />)}</div>
        )}
      </section>

      <section>
        <p className="eyebrow mb-3">{t('Recent updates')}</p>
        <Feed items={d.feed.slice(0, 10)} cur={cur} t={t} />
      </section>

      <section>
        <p className="eyebrow mb-3">{t('Everything in your account')}</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {all.map((x) => (
            <Link key={x.href} href={x.href} className="flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-ink/5 transition hover:ring-gold/40">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sand text-gold-deep"><x.icon className="h-5 w-5" /></span>
              <span>
                <b className="block text-sm text-ink">{x.title}</b>
                <small className="text-xs text-ink/55">{x.text}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
