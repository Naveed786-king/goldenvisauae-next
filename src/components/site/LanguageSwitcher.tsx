'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { LOCALES, splitLocale, localizePath } from '@/lib/i18n/config';
import { useLocale, useLanguages } from './SiteProvider';
import { cn } from '@/lib/utils';

export default function LanguageSwitcher({ variant = 'header' }: { variant?: 'header' | 'sheet' }) {
  const pathname = usePathname() || '/';
  const locale = useLocale();
  const enabled = useLanguages();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { path } = splitLocale(pathname);
  const langs = LOCALES.filter((l) => enabled.includes(l.code));
  const current = LOCALES.find((l) => l.code === locale) || LOCALES[0];

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, []);

  // after a language switch, return to the same place on the page
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('gv_switch_scroll');
      if (!saved) return;
      sessionStorage.removeItem('gv_switch_scroll');
      const { p, ratio } = JSON.parse(saved);
      if (p !== path) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: Math.max(0, ratio * max), behavior: 'instant' as ScrollBehavior });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (code: string) => {
    if (code === locale) return setOpen(false);
    try {
      document.cookie = `rgv_lang=${code};path=/;max-age=31536000`;
      document.cookie = 'rgv_switch=1;path=/;max-age=8';
      const max = document.documentElement.scrollHeight - window.innerHeight;
      sessionStorage.setItem('gv_switch_scroll', JSON.stringify({ p: path, ratio: max > 0 ? window.scrollY / max : 0 }));
    } catch {}
    // full page load so the whole page (incl. right-to-left direction) switches language
    window.location.href = localizePath(path, code) + window.location.search + window.location.hash;
  };

  if (langs.length < 2) return null;

  if (variant === 'sheet') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {langs.map((l) => (
          <button key={l.code} onClick={() => go(l.code)} className={cn('flex min-w-0 items-center gap-2 rounded-2xl px-3 py-3 text-start text-sm transition', l.code === locale ? 'chip-active font-medium' : 'bg-[#f5f5f7] text-[#1d1d1f] active:scale-[.98]')}>
            <span className="text-base leading-none">{l.flag}</span>
            <span className="truncate">{l.native}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-[0.84rem] font-medium text-[#1d1d1f] transition hover:bg-black/[0.045]" aria-label="Change language" aria-expanded={open}>
        <Globe className="h-4 w-4 text-gold-deep" />
        <span className="uppercase">{current.code}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 opacity-60 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="glass-menu mega-panel absolute end-0 top-full z-50 mt-3 w-60 rounded-2xl p-1.5">
          {langs.map((l) => (
            <button key={l.code} onClick={() => go(l.code)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start text-sm transition-colors', l.code === locale ? 'bg-[#faf3df] font-medium text-[#5c4410]' : 'text-[#1d1d1f] hover:bg-black/[0.04]')}>
              <span className="text-lg leading-none">{l.flag}</span>
              <span className="flex-1">{l.native}</span>
              {l.code === locale && <Check className="h-4 w-4 text-gold-deep" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
