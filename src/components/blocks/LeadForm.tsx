'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CircleCheck, LoaderCircle, Lock } from 'lucide-react';
import { SERVICE_OPTIONS } from '@/lib/defaults';
import { cn } from '@/lib/utils';
import { useT } from '@/components/site/SiteProvider';

export default function LeadForm({ defaultService, compact, dark }: { defaultService?: string; compact?: boolean; dark?: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('loading');
    setError('');
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    try {
      const r = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, source: pathname }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t('Something went wrong'));
      setState('done');
    } catch (err: any) {
      setError(err.message);
      setState('error');
    }
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {state === 'done' ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <CircleCheck className="h-10 w-10" />
            </motion.span>
            <h3 className="mt-6 font-display text-3xl font-semibold">{t('Thank you!')}</h3>
            <p className="mt-2 opacity-70">{t('Your enquiry has been received. A consultant will contact you within 24 hours (usually much sooner).')}</p>
            <button onClick={() => setState('idle')} className="mt-6 text-sm font-bold text-gold-deep underline underline-offset-4">
              {t('Send another enquiry')}
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={onSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cn('grid gap-4 min-w-0 [&>*]:min-w-0', !compact && 'sm:grid-cols-2')}>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            <input name="name" required placeholder={t('Full name') + ' *'} className="field" />
            <input name="phone" required placeholder={t('Phone / WhatsApp') + ' *'} className="field" />
            <input name="email" type="email" placeholder={t('Email address')} className="field" />
            <input name="nationality" placeholder={t('Nationality')} className="field" />
            <select name="service" defaultValue={defaultService || ''} className={cn('field', !compact && 'sm:col-span-2')}>
              <option value="">{t('Select a service')}</option>
              {SERVICE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {t(s)}
                </option>
              ))}
            </select>
            <textarea name="message" rows={compact ? 3 : 4} placeholder={t('How can we help you?')} className={cn('field resize-none', !compact && 'sm:col-span-2')} />
            {error && <p className={cn('text-sm text-red-500', !compact && 'sm:col-span-2')}>{error}</p>}
            <div className={cn('flex flex-col gap-4 justify-between', !compact && 'sm:flex-row sm:items-center sm:col-span-2')}>
              <p className={cn('flex items-center gap-2 text-xs', dark ? 'text-white/50' : 'text-ink/50')}>
                <Lock className="h-3.5 w-3.5" /> {t('Your details are 100% confidential.')}
              </p>
              <button disabled={state === 'loading'} className={cn('btn btn-gold', compact && 'w-full')}>
                {state === 'loading' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t('Get free consultation')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
