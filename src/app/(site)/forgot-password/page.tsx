import { getI18n } from '@/lib/i18n/server';
import AuthShell from '@/components/portal/AuthShell';
import { ForgotForm } from '@/components/portal/AuthForms';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('Forgot Password'), robots: { index: false } };
}

export default function ForgotPage() {
  return (
    <AuthShell title="Forgot password?" subtitle="Enter your email and we will send you a reset link.">
      <ForgotForm />
    </AuthShell>
  );
}
