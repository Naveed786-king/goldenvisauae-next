import { getI18n } from '@/lib/i18n/server';
import AuthShell from '@/components/portal/AuthShell';
import { RegisterForm } from '@/components/portal/AuthForms';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('Create Account'), robots: { index: false } };
}

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" subtitle="Apply online and follow every step of your visa in real time.">
      <RegisterForm />
    </AuthShell>
  );
}
