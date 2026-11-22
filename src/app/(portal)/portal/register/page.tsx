import type { Metadata } from 'next';
import { SITE } from '@/adgv/lib/site';
import { redirect } from 'next/navigation';
import { ActionForm, Submit } from '@/adgv/components/dash/ActionForm';
import { AuthShell } from '@/adgv/components/dash/AuthShell';
import { LangSelect, PasswordInput } from '@/adgv/components/dash/LangSelect';
import { currentCustomer, portalBase, T } from '@/adgv/lib/server/portal';
import { register, setLang } from '../actions';
import { BRAND_DIR } from '@/adgv/lib/brand';

export const metadata: Metadata = { title: 'Create account' };
export const dynamic = 'force-dynamic';

export default async function Register({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const v = (k: string, n: number) => (q[k] || '').slice(0, n);
  const base = await portalBase();
  if (await currentCustomer()) redirect(`${base}/`);
  const { t, lang } = await T();
  return (
    <AuthShell eyebrow={t.leftEyebrow} title={t.createAccount} text={t.leftText} ticks={[t.tick1, t.tick2, t.tick3]}
      top={<div className="auth-top"><a href={`${SITE.url}/`} className="auth-logo"><img decoding="async" src={SITE.brand?.logo || `${BRAND_DIR}/logo.webp`} alt={SITE.name} /></a><a href={`${SITE.url}/`} className="auth-back">‹ {t.backToSite}</a><LangSelect action={setLang} current={lang.code} back={`${base}/register/`} label={t.language} /></div>}>
      <p className="eyebrow">{t.newHere}</p>
      <h2>{t.createAccount}</h2>
      <ActionForm action={register} className="stack">
        <div className="field"><label htmlFor="name">{t.name}</label><input id="name" name="name" autoComplete="name" defaultValue={v('name', 100)} required /></div>
        <div className="field"><label htmlFor="email">{t.email}</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={v('email', 160)} required /></div>
        <div className="field"><label htmlFor="phone">{t.phone}</label><input id="phone" name="phone" type="tel" placeholder="+971" autoComplete="tel" defaultValue={v('phone', 40)} required /></div>
        <PasswordInput id="password" name="password" label={`${t.password} (8+)`} autoComplete="new-password" />
        <Submit className="btn btn-gold">{t.register}</Submit>
      </ActionForm>
      <p className="switch-link">{t.haveAccount} <a href={`${base}/login/`}><b>{t.signIn}</b></a></p>
    </AuthShell>
  );
}
