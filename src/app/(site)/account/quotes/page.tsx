import Link from 'next/link';
import { Download, CheckCircle2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/lib/i18n/server';
import { formatDate } from '@/lib/utils';
import { loadDashboard } from '@/lib/portal/dashboard';
import { Empty, PageHead, fmtMoney } from '@/components/portal/DashParts';

/** Quotations: what we quoted for each file, the PDF, and accepting it. */
export default async function Quotes() {
  const user = (await getCurrentUser())!;
  const [{ t }, d] = await Promise.all([getI18n(), loadDashboard(user.id)]);
  const list = d.files.filter((f) => f.quote);
  return (
    <div>
      <PageHead eyebrow={t('Client portal')} title={t('Quotations')} />
      {list.length === 0 ? (
        <Empty text={t('No quotation yet. Your advisor sends one after checking your details.')} />
      ) : (
        <div className="grid gap-4">
          {list.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-ink/5">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs font-bold text-ink/50">{f.ref}</p>
                <p className="font-bold text-ink">{f.service}</p>
                <p className="text-xs text-ink/55">
                  {t('Sent')} {formatDate(f.quote!.sentAt)}
                  {f.quote!.validUntil && ` · ${t('Valid until')} ${formatDate(f.quote!.validUntil)}`}
                </p>
              </div>
              <b className="font-display text-2xl font-semibold text-ink">{fmtMoney(f.quote!.total, d.cur)}</b>
              <div className="flex flex-wrap gap-2">
                <a href={f.quote!.pdf} target="_blank" rel="noopener noreferrer" className="btn btn-sm bg-sand text-ink"><Download className="h-4 w-4" /> PDF</a>
                {f.quote!.acceptedAt ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {t('Accepted')} {formatDate(f.quote!.acceptedAt)}</span>
                ) : (
                  <Link href={`/account/applications/${f.id}`} className="btn btn-gold btn-sm">{t('Review & accept')}</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
