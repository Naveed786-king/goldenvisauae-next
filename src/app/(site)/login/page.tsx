import { getI18n } from '@/lib/i18n/server';
import { Suspense } from 'react';
import AuthShell from '@/components/portal/AuthShell';
import { LoginForm } from '@/components/portal/AuthForms';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('Client Login'), robots: { index: false } };
}

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to track your Golden Visa application.">
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
