import Link from 'next/link';
import { FileText, Upload } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/lib/i18n/server';
import { formatDate } from '@/lib/utils';
import { loadDashboard } from '@/lib/portal/dashboard';
import { Empty, PageHead } from '@/components/portal/DashParts';

const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Documents per file: what we shared with the client and what the client uploaded. */
export default async function Documents() {
  const user = (await getCurrentUser())!;
  const [{ t }, d] = await Promise.all([getI18n(), loadDashboard(user.id)]);
  const files = d.files.filter((f) => f.documents.some((x) => x.by === 'me' || x.shared));
  return (
    <div>
      <PageHead eyebrow={t('Client portal')} title={t('Documents')} />
      {files.length === 0 ? (
        <Empty text={t('No documents yet. Upload yours from an application, and the ones we prepare for you will appear here.')} cta={d.files[0] ? <Link href={`/account/applications/${d.files[0].id}`} className="btn btn-gold"><Upload className="h-4 w-4" /> {t('Upload documents')}</Link> : undefined} />
      ) : (
        <div className="space-y-6">
          {files.map((f) => (
            <section key={f.id} className="rounded-[2rem] bg-white p-5 ring-1 ring-ink/5 md:p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-bold text-ink/50">{f.ref}</p>
                  <p className="font-bold text-ink">{f.service}</p>
                </div>
                <Link href={`/account/applications/${f.id}`} className="btn btn-sm bg-sand text-ink"><Upload className="h-4 w-4" /> {t('Upload more')}</Link>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {f.documents.filter((x) => x.by === 'me' || x.shared).map((x) => (
                  <a key={x.id} href={`/api/files/${x.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-sand/60 px-4 py-3 text-sm transition hover:bg-sand">
                    <FileText className="h-4 w-4 shrink-0 text-gold-deep" />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-ink">{x.name}</b>
                      <small className="text-xs text-ink/50">{x.by === 'team' ? t('From your advisor') : t('Uploaded by you')} · {formatDate(x.at)} · {kb(x.size)}</small>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
