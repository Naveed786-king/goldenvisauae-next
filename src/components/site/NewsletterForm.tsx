'use client';
import { useState } from 'react';
import { ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { useT } from './SiteProvider';

export default function NewsletterForm() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const r = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      setState(r.ok ? 'done' : 'error');
      if (r.ok) setEmail('');
    } catch {
      setState('error');
    }
  }
  return (
    <form onSubmit={submit} className="flex rounded-2xl border border-black/10 bg-white p-1.5 transition-colors focus-within:border-gold">
      <label htmlFor="nl-email" className="sr-only">
        {t('Email address')}
      </label>
      <input id="nl-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={state === 'done' ? t('Subscribed — thank you!') : t('you@company.com')} className="min-w-0 flex-1 bg-transparent px-3 text-[16px] text-[#1d1d1f] outline-none placeholder:text-[#aeaeb2] sm:text-sm" />
      <button disabled={state === 'loading'} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0b0b0c] text-white transition hover:bg-[#222]" aria-label={t('Subscribe')}>
        {state === 'loading' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : state === 'done' ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
