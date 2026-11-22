import Link from 'next/link';
import { FilePlus } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/lib/i18n/server';
import { loadDashboard } from '@/lib/portal/dashboard';
import { Empty, FileRow, PageHead } from '@/components/portal/DashParts';

/** All the client's files: live ones first, then finished. */
export default async function Applications() {
  const user = (await getCurrentUser())!;
  const [{ t }, d] = await Promise.all([getI18n(), loadDashboard(user.id)]);
  const finished = d.files.filter((f) => f.key === 'done' || f.key === 'closed');
  return (
    <div>
      <PageHead eyebrow={t('Client portal')} title={t('My applications')}>
        <Link href="/apply" className="btn btn-gold btn-sm"><FilePlus className="h-4 w-4" /> {t('New application')}</Link>
      </PageHead>
      {d.files.length === 0 ? (
        <Empty text={t('You have not submitted any applications yet.')} cta={<Link href="/apply" className="btn btn-gold">{t('Start your Golden Visa application')}</Link>} />
      ) : (
        <div className="space-y-8">
          {d.open.length > 0 && (
            <section>
              <p className="eyebrow mb-3">{t('In progress')} · {d.open.length}</p>
              <div className="grid gap-3">{d.open.map((f) => <FileRow key={f.id} f={f} cur={d.cur} t={t} />)}</div>
            </section>
          )}
          {finished.length > 0 && (
            <section>
              <p className="eyebrow mb-3">{t('Finished')} · {finished.length}</p>
              <div className="grid gap-3">{finished.map((f) => <FileRow key={f.id} f={f} cur={d.cur} t={t} />)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
