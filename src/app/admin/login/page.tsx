import { Suspense } from 'react';
import { Emblem } from '@/components/site/Logo';
import { LoginForm, AdminSetupForm } from '@/components/portal/AuthForms';
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AdminLogin() {
  const site = await getSetting('site');
  const firstRun = (await prisma.user.count({ where: { role: 'ADMIN' } })) === 0;
  return (
    <main className="theme-dark relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="absolute inset-0 bg-pattern opacity-[0.06]" />
      <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gold/15 blur-[130px]" />
      <div className="on-light relative w-full max-w-md rounded-[2rem] bg-white text-ink p-8 md:p-10 shadow-2xl">
        <span className="grid h-14 w-14 place-items-center rounded-2xl text-[#2a1d05]" style={{ background: 'var(--gold-grad)' }}>
          <Emblem className="h-9 w-9" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-semibold !text-ink">{firstRun ? 'Create admin account' : 'Admin login'}</h1>
        <p className="mt-1 text-sm text-ink/55">{site.name} control panel</p>
        <div className="mt-8">
          <Suspense>
            {firstRun ? <AdminSetupForm /> : <LoginForm admin />}
          </Suspense>
        </div>
      </div>
    </main>
  );
}
