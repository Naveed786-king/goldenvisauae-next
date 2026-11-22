import { getI18n } from '@/lib/i18n/server';
import { Suspense } from 'react';
import AuthShell from '@/components/portal/AuthShell';
import { ResetForm } from '@/components/portal/AuthForms';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('Reset Password'), robots: { index: false } };
}

export default function ResetPage() {
  return (
    <AuthShell title="Set a new password">
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
