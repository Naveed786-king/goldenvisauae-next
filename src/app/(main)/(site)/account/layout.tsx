import { getI18n } from '@/lib/i18n/server';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AccountNav from '@/components/portal/AccountNav';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('My Account'), robots: { index: false } };
}

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/account');
  return (
    <section className="theme-sand min-h-[70vh] pt-[6.5rem] sm:pt-[7.5rem]">
      <div className="ink-panel theme-dark mx-2.5 sm:mx-4">
        <div className="container-x relative py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl font-display text-2xl font-semibold text-[#1a1406]" style={{ background: 'var(--gold-grad)' }}>{user.name.charAt(0).toUpperCase()}</span>
            <div>
              <p className="eyebrow">Client portal</p>
              <h1 className="font-display text-3xl md:text-4xl font-semibold text-white">Marhaba, {user.name.split(' ')[0]}</h1>
            </div>
          </div>
          <AccountNav isStaff={user.role !== 'CUSTOMER'} />
        </div>
      </div>
      <div className="container-x py-10 md:py-14">{children}</div>
    </section>
  );
}
