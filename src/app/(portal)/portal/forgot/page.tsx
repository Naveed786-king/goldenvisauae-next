import type { Metadata } from 'next';
import { SITE } from '@/adgv/lib/site';
import { ActionForm, Submit } from '@/adgv/components/dash/ActionForm';
import { AuthShell } from '@/adgv/components/dash/AuthShell';
import { LangSelect, PasswordInput } from '@/adgv/components/dash/LangSelect';
import { portalBase, T } from '@/adgv/lib/server/portal';
import { sendResetCode, setLang } from '../actions';
import { BRAND_DIR } from '@/adgv/lib/brand';

export const metadata: Metadata = { title: 'Reset password' };
export const dynamic = 'force-dynamic';

export default async function Forgot() {
  const base = await portalBase();
  const { t, lang } = await T();
  return (
    <AuthShell eyebrow={t.leftEyebrow} title={t.resetTitle} text={t.leftText} ticks={[t.tick1, t.tick2, t.tick3]}
      top={<div className="auth-top"><a href={`${SITE.url}/`} className="auth-logo"><img decoding="async" src={SITE.brand?.logo || `${BRAND_DIR}/logo.webp`} alt={SITE.name} /></a><a href={`${SITE.url}/`} className="auth-back">‹ {t.backToSite}</a><LangSelect action={setLang} current={lang.code} back={`${base}/forgot/`} label={t.language} /></div>}>
      <h2>{t.resetTitle}</h2>
      <p className="muted">{t.resetText}</p>
      <ActionForm action={sendResetCode} className="stack">
        <div className="field"><label htmlFor="email">{t.email}</label><input id="email" name="email" type="email" required /></div>
        <Submit className="btn">{t.sendCode}</Submit>
      </ActionForm>
      <p className="switch-link"><a href={`${base}/login/`}>{t.backToLogin}</a></p>
    </AuthShell>
  );
}
