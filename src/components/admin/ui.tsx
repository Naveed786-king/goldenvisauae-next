'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CircleCheck, CircleAlert, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------- API helper ---------- */
const BUSY = 'The server is restarting or busy for a moment. Please try again in a few seconds.';
const OFFLINE = 'No connection to the server. Check your internet and try again.';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
// 502/503/504 come from the web server while the site restarts (deploy, update); 408/429 are "slow down"
const passing = (s: number) => s === 502 || s === 503 || s === 504 || s === 408 || s === 429;

/**
 * Admin requests. Reading (GET) is retried a few times when the server is briefly away
 * (restart after a deploy, laptop waking up), so short gaps never show as errors.
 * Saving is never retried automatically (it might run twice); it gets a clear message instead.
 */
export async function api<T = any>(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any): Promise<T> {
  const tries = method === 'GET' ? 4 : 1;
  for (let i = 0; ; i++) {
    let r: Response;
    try {
      r = await fetch(url, {
        method,
        headers: body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
        cache: 'no-store',
        credentials: 'same-origin',
      });
    } catch {
      if (i + 1 < tries) {
        await wait(1500 * (i + 1));
        continue;
      }
      throw new Error(typeof navigator !== 'undefined' && navigator.onLine === false ? OFFLINE : BUSY);
    }
    if (passing(r.status) && i + 1 < tries) {
      await wait(1500 * (i + 1));
      continue;
    }
    // a restarting server can answer with an HTML page instead of JSON
    const d: any = await r.json().catch(() => ({}));
    if (r.status === 401) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/admin/login?next=${next}`;
      throw new Error('Your session ended. Please sign in again.');
    }
    if (passing(r.status)) throw new Error(BUSY);
    if (!r.ok) throw new Error(d?.error || `Request failed (${r.status})`);
    return d as T;
  }
}

/* ---------- Toasts ---------- */
type T = { id: number; msg: string; type: 'success' | 'error' | 'info' };
const lastShown = new Map<string, number>();
export function toast(msg: string, type: T['type'] = 'success') {
  // pages that refresh every few seconds must not stack the same error again and again
  const key = `${type}:${msg}`;
  const now = Date.now();
  if (type === 'error' && now - (lastShown.get(key) || 0) < 15_000) return;
  lastShown.set(key, now);
  window.dispatchEvent(new CustomEvent('admin-toast', { detail: { msg, type } }));
}
export function Toaster() {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent).detail;
      const id = Date.now() + Math.random();
      setItems((x) => [...x, { id, ...d }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4200);
    };
    window.addEventListener('admin-toast', on);
    return () => window.removeEventListener('admin-toast', on);
  }, []);
  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className={cn('flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-2xl min-w-[260px] max-w-sm', t.type === 'error' ? 'bg-red-600 text-white' : t.type === 'info' ? 'bg-white text-gray-900 ring-1 ring-[#ecd9a3] shadow-[#c99a3c]/30' : 'bg-emerald-600 text-white')}
          >
            {t.type === 'error' ? <CircleAlert className="h-5 w-5 shrink-0" /> : <CircleCheck className="h-5 w-5 shrink-0" />}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Layout bits ---------- */
export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-2xl md:text-[1.7rem] font-extrabold tracking-tight text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, actions }: { children: React.ReactNode; className?: string; title?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className={cn('rounded-2xl bg-white ring-1 ring-gray-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)]', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
          {title && <h3 className="text-sm font-bold text-gray-900">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

export function Btn({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'dark' | 'ghost' | 'danger' | 'outline'; size?: 'sm' | 'md'; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
        size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm',
        variant === 'primary' && 'bg-gold text-ink hover:brightness-105 shadow-sm',
        variant === 'dark' && 'bg-ink text-white hover:bg-ink-2',
        variant === 'ghost' && 'text-gray-600 hover:bg-gray-100',
        variant === 'outline' && 'ring-1 ring-gray-300 text-gray-700 hover:bg-gray-50 bg-white',
        variant === 'danger' && 'bg-red-50 text-red-600 hover:bg-red-100',
        className
      )}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; wide?: boolean | 'xl'; footer?: React.ReactNode }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm md:p-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ y: 30, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }} className={cn('w-full rounded-2xl bg-white shadow-2xl', wide === 'xl' ? 'max-w-6xl' : wide ? 'max-w-3xl' : 'max-w-lg')}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="font-bold text-gray-900">{title}</h3>
              <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4 bg-gray-50/60 rounded-b-2xl">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function confirmDialog(message: string) {
  return window.confirm(message);
}

export function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-gray-500">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 select-none">
      <button type="button" onClick={() => onChange(!checked)} className={cn('relative h-6 w-11 rounded-full transition', checked ? 'bg-gold' : 'bg-gray-300')} aria-pressed={checked}>
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </button>
      {label && <span className="text-sm font-semibold text-gray-700">{label}</span>}
    </label>
  );
}

export function Spinner() {
  return (
    <div className="grid place-items-center py-20">
      <LoaderCircle className="h-7 w-7 animate-spin text-gold" />
    </div>
  );
}
