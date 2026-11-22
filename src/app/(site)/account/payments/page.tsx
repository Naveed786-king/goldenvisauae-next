import Link from 'next/link';
import { Download, CreditCard } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/lib/i18n/server';
import { cn, formatDate } from '@/lib/utils';
import { loadDashboard } from '@/lib/portal/dashboard';
import { Empty, PageHead, fmtMoney } from '@/components/portal/DashParts';

/** Every payment of every file: open ones to pay, paid ones with their receipt. */
export default async function Payments() {
  const user = (await getCurrentUser())!;
  const [{ t }, d] = await Promise.all([getI18n(), loadDashboard(user.id)]);
  const rows = d.files.flatMap((f) => f.payments.map((p) => ({ ...p, ref: f.ref, service: f.service, fileId: f.id })));
  const due = rows.filter((p) => p.status === 'due');
  const done = rows.filter((p) => p.status !== 'due');
  return (
    <div>
      <PageHead eyebrow={t('Client portal')} title={t('Payments & receipts')} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-ink/5">
          <small className="text-xs font-bold uppercase tracking-wider text-ink/50">{t('To pay now')}</small>
          <b className={cn('mt-1 block font-display text-3xl font-semibold', d.totals.due > 0 ? 'text-red-600' : 'text-ink')}>{fmtMoney(d.totals.due, d.cur)}</b>
        </div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-ink/5">
          <small className="text-xs font-bold uppercase tracking-wider text-ink/50">{t('Paid with us')}</small>
          <b className="mt-1 block font-display text-3xl font-semibold text-ink">{fmtMoney(d.totals.paid, d.cur)}</b>
        </div>
      </div>
      {rows.length === 0 ? (
        <Empty text={t('No payments yet. When your advisor requests a payment it shows here.')} />
      ) : (
        <div className="space-y-8">
          {due.length > 0 && (
            <section>
              <p className="eyebrow mb-3">{t('Open payments')} · {due.length}</p>
              <div className="grid gap-3">
                {due.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-red-200">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-50 text-red-600"><CreditCard className="h-5 w-5" /></span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-ink">{p.label}</b>
                      <small className="text-xs text-ink/55">{p.ref} · {p.service} · {formatDate(p.at)}</small>
                    </span>
                    <b className="text-lg text-ink">{fmtMoney(p.total, d.cur)}</b>
                    <Link href={p.pay} className="btn btn-gold btn-sm">{t('Pay now')}</Link>
                  </div>
                ))}
              </div>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <p className="eyebrow mb-3">{t('History')}</p>
              <div className="divide-y divide-ink/5 overflow-hidden rounded-2xl bg-white ring-1 ring-ink/5">
                {done.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <b className="block text-sm text-ink">{p.label}</b>
                      <small className="text-xs text-ink/55">{p.ref} · {formatDate(p.at)}{p.method && ` · ${p.method}`}{p.receiptNo && ` · ${t('Receipt')} ${p.receiptNo}`}</small>
                    </span>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[0.68rem] font-extrabold uppercase', p.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600')}>{t(p.status === 'paid' ? 'Paid' : p.status === 'pending' ? 'Checking' : 'Cancelled')}</span>
                    <b className="text-sm text-ink">{fmtMoney(p.total, d.cur)}</b>
                    {p.receipt && <a href={p.receipt} target="_blank" rel="noopener noreferrer" className="btn btn-sm bg-sand text-ink"><Download className="h-4 w-4" /> {t('Receipt')}</a>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
