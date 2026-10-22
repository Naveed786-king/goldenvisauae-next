'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Plus, Calculator, CircleCheck, LoaderCircle, Send, Lock, RotateCcw, Star, Quote } from 'lucide-react';
import { useLocale, useSite, useT } from '@/components/site/SiteProvider';
import { localizePath } from '@/lib/i18n/config';
import { withDirham } from '@/components/ui/Dirham';
import { cn } from '@/lib/utils';
import { WhatsAppIcon } from './parts';
import Slider3D from '@/components/ui/Slider3D';

export const CALC_EVENT = 'open-cost-calculator';
export const openCalculator = () => window.dispatchEvent(new CustomEvent(CALC_EVENT));

function waUrl(number: string, text: string) {
  return `https://wa.me/${(number || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
}

/** Saves a lead without waiting (keeps working while the page opens WhatsApp) */
function saveLead(body: Record<string, any>) {
  try {
    return fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true });
  } catch {
    return Promise.resolve(null as any);
  }
}

/* ------------------------------------------------------------------ accordion */
export function Accordion({ items, first = true }: { items: { q: string; a: string }[]; first?: boolean }) {
  const [open, setOpen] = useState<number | null>(first ? 0 : null);
  return (
    <div className="border-t border-black/[0.08]">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="acc-item" {...{ 'open-state': isOpen ? '1' : '0' }}>
            <h3>
              <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-start justify-between gap-5 py-5 text-start">
                <span className="min-w-0 text-[1.02rem] font-medium leading-snug">{withDirham(it.q)}</span>
                <span className="acc-icon grid h-8 w-8 shrink-0 place-items-center rounded-full border border-black/10">
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            </h3>
            <div className="acc-body">
              <div className="overflow-hidden">
                <p className="muted pb-6 pe-12 text-[0.95rem] leading-relaxed">{withDirham(it.a)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ calculator button */
export function CalcButton({ label, className = 'btn btn-gold' }: { label: string; className?: string }) {
  return (
    <button type="button" onClick={openCalculator} className={className}>
      <Calculator className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ simple lead forms */
function useLeadSubmit(source: string) {
  const t = useT();
  const pathname = usePathname();
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>, extra: Record<string, any> = {}) {
    e.preventDefault();
    setState('loading');
    setError('');
    const body = { ...Object.fromEntries(new FormData(e.currentTarget).entries()), ...extra, source: `${source} · ${pathname}` };
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || t('Something went wrong'));
      setState('done');
    } catch (err: any) {
      setError(err.message || t('Something went wrong'));
      setState('error');
    }
  }
  return { state, error, submit, reset: () => setState('idle'), t };
}

function Done({ title, text, onAgain }: { title: string; text: string; onAgain: () => void }) {
  const t = useT();
  return (
    <div className="py-8 text-center" style={{ animation: 'pop .4s cubic-bezier(.2,.8,.2,1) both' }}>
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/12 text-emerald-600">
        <CircleCheck className="h-8 w-8" />
      </span>
      <p className="mt-5 font-display text-2xl font-semibold">{title}</p>
      <p className="muted mx-auto mt-2 max-w-sm text-sm">{text}</p>
      <button type="button" onClick={onAgain} className="mt-5 text-sm font-medium text-gold-deep underline underline-offset-4">
        {t('Send another enquiry')}
      </button>
    </div>
  );
}


function Consent() {
  const t = useT();
  const locale = useLocale();
  return (
    <label className="flex items-start gap-2.5 text-[0.8rem] leading-snug text-[#6e6e73] sm:col-span-2">
      <input type="checkbox" name="consent" value="yes" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#0b0b0c]" />
      <span>
        {t('I agree to the processing of my personal data as described in the')}{' '}
        <a href={localizePath('/privacy', locale)} className="font-medium text-[#1d1d1f] underline underline-offset-2">
          {t('Privacy Policy')}
        </a>
        .
      </span>
    </label>
  );
}

export function ContactForm({ topics, title, text, consent, compact }: { topics: string[]; title?: string; text?: string; consent?: boolean; compact?: boolean }) {
  const { state, error, submit, reset, t } = useLeadSubmit('Contact form');
  if (state === 'done') return <Done title={t('Thank you!')} text={t('Your enquiry has been received. A consultant will contact you within 24 hours (usually much sooner).')} onAgain={reset} />;
  return (
    <form onSubmit={(e) => submit(e)} className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
      {title && <h2 className="font-display text-2xl font-semibold sm:col-span-2">{title}</h2>}
      {text && <p className="muted -mt-2 text-sm sm:col-span-2">{text}</p>}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="block">
        <span className="label">{t('Full name')} *</span>
        <input name="name" required autoComplete="name" className="field" />
      </label>
      <label className="block">
        <span className="label">{t('Phone')} *</span>
        <input name="phone" required type="tel" autoComplete="tel" className="field" />
      </label>
      <label className="block sm:col-span-2">
        <span className="label">{t('Email')}</span>
        <input name="email" type="email" autoComplete="email" className="field" />
      </label>
      {topics.length > 0 && (
        <label className="block sm:col-span-2">
          <span className="label">{t('What can we help with?')}</span>
          <select name="service" className="field">
            {topics.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
      )}
      {!compact && (
        <label className="block sm:col-span-2">
          <span className="label">{t('Message')}</span>
          <textarea name="message" rows={4} className="field resize-none" />
        </label>
      )}
      {consent && <Consent />}
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="muted flex items-center gap-2 text-xs">
          <Lock className="h-3.5 w-3.5" /> {t('Your details are 100% confidential.')}
        </p>
        <button disabled={state === 'loading'} className="btn btn-dark">
          {state === 'loading' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t('Send enquiry')}
        </button>
      </div>
    </form>
  );
}

export function CallbackForm({ button, consent }: { button?: string; consent?: boolean }) {
  const { state, error, submit, reset, t } = useLeadSubmit('Call-back request');
  if (state === 'done') return <Done title={t('Thank you!')} text={t('A consultant will call you shortly.')} onAgain={reset} />;
  return (
    <form onSubmit={(e) => submit(e, { service: 'Call back request' })} className="mt-5 grid gap-3 sm:grid-cols-2 [&>*]:min-w-0">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <input name="name" required placeholder={t('Full name') + ' *'} autoComplete="name" className="field" />
      <input name="phone" required type="tel" placeholder={t('Phone number') + ' *'} autoComplete="tel" className="field" />
      <input name="email" type="email" placeholder={t('Email address')} autoComplete="email" className="field sm:col-span-2" />
      {consent && <Consent />}
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <button disabled={state === 'loading'} className="btn btn-gold sm:col-span-2">
        {state === 'loading' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {button || t('Request call back')}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ visa validity checker */
export function VisaStatusForm({ d }: { d: any }) {
  const site = useSite();
  const t = useT();
  const pathname = usePathname();
  const emirates: string[] = String(d.emirates || '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const [error, setError] = useState(false);
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const g = (k: string) => String(f.get(k) || '').trim();
    if (!g('passport') || !g('nationality') || !g('dob')) {
      setError(true);
      return;
    }
    setError(false);
    const rows = [
      d.waIntro || 'Visa validity check',
      '',
      `${d.passport}: ${g('passport')}`,
      `${d.nationality}: ${g('nationality')}`,
      `${d.dob}: ${g('dob')}`,
      g('expiry') ? `${d.expiry}: ${g('expiry')}` : '',
      g('emirate') ? `${d.emirate}: ${g('emirate')}` : '',
      g('notes') ? `${d.notes}: ${g('notes')}` : '',
    ].filter((x, i) => x || i === 1);
    const text = rows.join('\n');
    // open WhatsApp first (pop-up blockers allow it only straight after the click), then save the lead
    window.open(waUrl(site?.whatsapp || '', text), '_blank', 'noopener');
    saveLead({ name: `Visa check — ${g('passport')}`, phone: '', email: '', nationality: g('nationality'), service: 'Visa validity check', message: text, source: `Visa validity checker · ${pathname}`, allowNoContact: true });
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} onReset={() => { setError(false); setSent(false); }} className="card p-6 sm:p-8" noValidate>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold">{d.formHeading}</p>
          {d.formSub && <p className="muted mt-1 text-xs">{d.formSub}</p>}
        </div>
        <span className="icon-chip">
          <Lock className="h-5 w-5" />
        </span>
      </div>
      <div className="hairline my-6" />
      <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
        <label className="block sm:col-span-2">
          <span className="label">{d.passport} *</span>
          <input name="passport" className="field" placeholder={d.passportPh} autoComplete="off" />
        </label>
        <label className="block sm:col-span-2">
          <span className="label">{d.nationality} *</span>
          <input name="nationality" className="field" placeholder={d.nationalityPh} autoComplete="country-name" />
        </label>
        <label className="block">
          <span className="label">{d.dob} *</span>
          <input name="dob" type="date" className="field" />
        </label>
        <label className="block">
          <span className="label">{d.expiry}</span>
          <input name="expiry" type="date" className="field" />
        </label>
        {emirates.length > 0 && (
          <label className="block sm:col-span-2">
            <span className="label">{d.emirate}</span>
            <select name="emirate" className="field">
              {emirates.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        )}
        <label className="block sm:col-span-2">
          <span className="label">{d.notes}</span>
          <textarea name="notes" rows={3} className="field resize-none" placeholder={d.notesPh} />
        </label>
      </div>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{d.error}</p>}
      {sent && !error && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CircleCheck className="h-4 w-4 shrink-0" /> {t('Sent — we reply on WhatsApp shortly.')}
        </p>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <button type="submit" className="btn btn-gold">
          <WhatsAppIcon />
          {d.submit}
        </button>
        <button type="reset" className="btn btn-outline">
          <RotateCcw className="h-4 w-4" />
          {d.reset}
        </button>
      </div>
      {d.footnote && <p className="muted mt-4 text-xs leading-relaxed">{d.footnote}</p>}
    </form>
  );
}

/* ------------------------------------------------------------------ reviews with "show more" */
export function ReviewGrid({ items, limit }: { items: { id: string; name: string; role?: string | null; country?: string | null; text: string; rating: number }[]; limit: number }) {
  const t = useT();
  const [all, setAll] = useState(false);
  const [phone, setPhone] = useState(false);
  useEffect(() => setPhone(window.matchMedia('(max-width: 767px)').matches), []);
  const shown = all || phone ? items : items.slice(0, Math.max(1, limit || 6));
  return (
    <>
      <Slider3D className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3" label={t('Client reviews')}>
        {shown.map((r, i) => (
          <figure key={r.id} className="card card-lift tilt flex h-full flex-col p-7" data-tilt="5" style={{ animation: i >= limit ? 'pop .45s cubic-bezier(.2,.8,.2,1) both' : undefined }}>
            <div className="flex items-center justify-between">
              <Quote className="h-7 w-7 text-gold/40" />
              <span className="flex gap-0.5 text-gold">
                {Array.from({ length: Math.max(1, Math.min(5, r.rating || 5)) }).map((_, k) => (
                  <Star key={k} className="h-3.5 w-3.5 fill-current" />
                ))}
              </span>
            </div>
            <blockquote className="mt-5 flex-1 text-[0.98rem] leading-relaxed">{r.text}</blockquote>
            <figcaption className="mt-6 border-t border-black/[0.06] pt-5">
              <p className="font-display text-sm font-semibold">{r.name}</p>
              {(r.role || r.country) && <p className="muted mt-0.5 text-xs">{[r.role, r.country].filter(Boolean).join(', ')}</p>}
            </figcaption>
          </figure>
        ))}
      </Slider3D>
      {items.length > shown.length && (
        <div className="mt-8 hidden text-center md:block">
          <button type="button" onClick={() => setAll(true)} className={cn('btn btn-outline')}>
            {t('Show more reviews')}
          </button>
        </div>
      )}
    </>
  );
}
