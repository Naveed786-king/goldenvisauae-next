import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getI18n } from '@/lib/i18n/server';
import { getSetting } from '@/lib/settings';
import { cn, formatDate } from '@/lib/utils';
import { loadDashboard } from '@/lib/portal/dashboard';
import { Empty, PageHead } from '@/components/portal/DashParts';

/** One conversation per file with the advisor; unread ones on top. */
export default async function Messages() {
  const user = (await getCurrentUser())!;
  const [{ t }, d, site] = await Promise.all([getI18n(), loadDashboard(user.id), getSetting('site')]);
  const list = [...d.files].sort((a, b) => b.unread - a.unread || (b.lastMessage?.at || b.createdAt).localeCompare(a.lastMessage?.at || a.createdAt));
  return (
    <div>
      <PageHead eyebrow={t('Client portal')} title={t('Messages')}>
        <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm bg-emerald-600 text-white"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
      </PageHead>
      {list.length === 0 ? (
        <Empty text={t('Start an application to talk with your advisor here.')} cta={<Link href="/apply" className="btn btn-gold">{t('New application')}</Link>} />
      ) : (
        <div className="divide-y divide-ink/5 overflow-hidden rounded-2xl bg-white ring-1 ring-ink/5">
          {list.map((f) => (
            <Link key={f.id} href={`/account/applications/${f.id}#chat`} className={cn('flex items-center gap-4 px-4 py-4 transition hover:bg-sand/60', f.unread > 0 && 'bg-blue-50/40')}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sand font-display text-lg font-semibold text-gold-deep">{f.service.charAt(0)}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <b className="truncate text-sm text-ink">{f.service}</b>
                  <small className="font-mono text-[0.68rem] text-ink/45">{f.ref}</small>
                </span>
                <small className={cn('block truncate text-xs', f.unread ? 'font-bold text-ink' : 'text-ink/55')}>
                  {f.lastMessage ? `${f.lastMessage.fromAdmin ? t('Advisor') + ': ' : t('You') + ': '}${f.lastMessage.body}` : t('No messages yet. Write to your advisor.')}
                </small>
              </span>
              <span className="shrink-0 text-end">
                {f.unread > 0 && <span className="mb-1 inline-grid min-w-6 place-items-center rounded-full bg-red-500 px-1.5 text-[0.7rem] font-extrabold text-white">{f.unread}</span>}
                {f.lastMessage && <small className="block text-xs text-ink/45">{formatDate(f.lastMessage.at)}</small>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
