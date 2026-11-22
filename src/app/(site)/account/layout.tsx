import { getI18n } from '@/lib/i18n/server';
import { redirect } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import { loadDashboard } from '@/lib/portal/dashboard';
import AccountNav from '@/components/portal/AccountNav';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('My Account'), robots: { index: false } };
}

/** Client dashboard frame: side bar with the client's name and menu, the page on the right. */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account');
  const [{ t }, d, site] = await Promise.all([getI18n(), loadDashboard(user.id), getSetting('site')]);
  const counts = { files: d.files.length, quotes: d.totals.quotes, due: d.totals.dueCount, docs: d.totals.docs, unread: d.totals.unread };
  return (
    <section className="theme-sand min-h-[70vh] pt-[6.5rem] sm:pt-[7.5rem]">
      <div className="container-x grid gap-6 py-6 md:py-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-[2rem] bg-white/60 p-3 ring-1 ring-ink/5 lg:p-4">
            <div className="hidden items-center gap-3 px-2 pb-4 pt-1 lg:flex">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl font-display text-xl font-semibold text-[#1a1406]" style={{ background: 'var(--gold-grad)' }}>
                {user.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-bold text-ink">{user.name}</p>
                <p className="truncate text-xs text-ink/50">{user.email}</p>
              </div>
            </div>
            <AccountNav isStaff={user.role !== 'CUSTOMER'} counts={counts} />
            <a
              href={`https://wa.me/${site.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 hidden items-center gap-3 rounded-2xl bg-ink p-4 text-sm text-white/80 lg:flex"
            >
              <MessageCircle className="h-5 w-5 shrink-0 text-gold" />
              <span>
                <b className="block text-white">{t('Need help?')}</b>
                {t('WhatsApp your advisor')}
              </span>
            </a>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
