'use client';

import { PORTAL_LANGS } from '@/adgv/lib/portal-i18n';
import { PwInput } from './PwInput';
import { Icon } from '@/adgv/components/Icon';

/** Language picker for the customer dashboard; saves the choice and reloads the page. */
export function LangSelect({ action, current, back, label }: { action: (f: FormData) => Promise<void>; current: string; back: string; label: string }) {
  return (
    <form action={action} className="lang-pick">
      <input type="hidden" name="back" value={back} />
      <span className="lp-ic" aria-hidden="true"><Icon name="globe" size={20} /><b>{current.toUpperCase()}</b></span>
      <select name="lang" aria-label={label} defaultValue={current} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        {PORTAL_LANGS.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
      </select>
    </form>
  );
}

export function PasswordInput({ id, name, label, autoComplete }: { id: string; name: string; label: string; autoComplete?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <PwInput id={id} name={name} autoComplete={autoComplete} required />
    </div>
  );
}
