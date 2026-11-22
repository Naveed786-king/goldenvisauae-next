import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ActionForm, Submit } from '@/adgv/components/dash/ActionForm';
import { AuthShell } from '@/adgv/components/dash/AuthShell';
import { LangSelect, PasswordInput } from '@/adgv/components/dash/LangSelect';
import { currentCustomer, portalBase, T } from '@/adgv/lib/server/portal';
import { SITE, waLink } from '@/adgv/lib/site';
import { findFile, login, setLang } from '../actions';
import { BRAND_CODE, BRAND_DIR } from '@/adgv/lib/brand';

export const metadata: Metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const base = await portalBase();
  if (await currentCustomer()) redirect(`${base}/`);
  const { t, lang } = await T();
  return (
    <AuthShell eyebrow={t.leftEyebrow} title={t.leftTitle} text={t.leftText} ticks={[t.tick1, t.tick2, t.tick3]}
      top={<div className="auth-top"><a href={`${SITE.url}/`} className="auth-logo"><img decoding="async" src={SITE.brand?.logo || `${BRAND_DIR}/logo.webp`} alt={SITE.name} /></a><a href={`${SITE.url}/`} className="auth-back">‹ {t.backToSite}</a><LangSelect action={setLang} current={lang.code} back={`${base}/login/`} label={t.language} /></div>}>
      <p className="eyebrow">{t.signIn}</p>
      <h2>{t.welcomeBack}</h2>
      <p className="muted">{t.enterDetails}</p>
      <ActionForm action={login} className="stack">
        <div className="field"><label htmlFor="email">{t.email}</label><input id="email" name="email" type="email" autoComplete="username" defaultValue={(q.email || '').slice(0, 160)} required /></div>
        <PasswordInput id="password" name="password" label={t.password} autoComplete="current-password" />
        <p className="small" style={{ textAlign: 'end', margin: '6px 0 0' }}><a href={`${base}/forgot/`}>{t.forgot}</a></p>
        <Submit className="btn btn-gold">{t.signIn}</Submit>
      </ActionForm>
      <p className="switch-link">{t.newHere} <a href={`${base}/register/`}><b>{t.createAccount}</b></a></p>
      <p className="or">— {t.orRef} —</p>
      <details className="more">
        <summary style={{ textAlign: 'center' }}>{t.openFile}</summary>
        <ActionForm action={findFile} className="form" >
          <div className="field"><label htmlFor="ref">{t.reference}</label><input id="ref" name="ref" placeholder={`${BRAND_CODE}-0001`} required /></div>
          <div className="field"><label htmlFor="rphone">{t.phone}</label><input id="rphone" name="phone" type="tel" placeholder="+971" required /></div>
          <div className="full"><Submit className="btn">{t.openFile}</Submit></div>
        </ActionForm>
      </details>
      <a className="btn btn-wa" style={{ marginTop: 18 }} href={waLink('Hello, I need help with my Golden Visa portal.')} target="_blank" rel="noopener">{t.needHelp}</a>
    </AuthShell>
  );
}
