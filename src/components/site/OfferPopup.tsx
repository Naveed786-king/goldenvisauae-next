'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Check, Clock3, ShieldCheck, Zap, Minus } from 'lucide-react';
import type { OfferSettings } from '@/lib/offer';
import SmartLink from '@/components/ui/SmartLink';
import { Dirham } from '@/components/ui/Dirham';
import { SocialIcon } from '@/components/ui/Icon';
import { useSite } from './SiteProvider';
import { Emblem } from './Logo';
import { cn } from '@/lib/utils';

/** "Limited time offer" pop-up — once per page per visit, never on admin / account / apply pages */
export default function OfferPopup({ offer }: { offer: OfferSettings }) {
  const pathname = usePathname() || '/';
  const site = useSite();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const shown = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!offer.enabled || !offer.packages?.length) return;
    if (/\/(apply|login|register|account|forgot-password|reset-password)(\/|$)/.test(pathname)) return;
    try {
      const seen = JSON.parse(sessionStorage.getItem('gv_offer') || '[]');
      if (seen.includes(pathname) || seen.length >= 2) return;
    } catch {}
    if (shown.current.has(pathname)) return;
    shown.current.add(pathname);
    const id = window.setTimeout(() => {
      setOpen(true);
      try {
        const seen = JSON.parse(sessionStorage.getItem('gv_offer') || '[]');
        sessionStorage.setItem('gv_offer', JSON.stringify([...seen, pathname]));
      } catch {}
    }, Math.max(2, Number(offer.delay) || 8) * 1000);
    return () => window.clearTimeout(id);
  }, [pathname, offer]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;
  const close = () => setOpen(false);
  const chosen = offer.packages[selected] ?? offer.packages[0];
  const bullets = (offer.bullets || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const wa = `https://wa.me/${(site?.whatsapp || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`${offer.waPrefix} ${chosen.name} — ${chosen.time} (AED ${chosen.price})`)}`;

  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={offer.title}>
      <div className="sheet-backdrop" onClick={close} />
      <div className="relative z-[86] max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-[0_50px_120px_-40px_rgba(0,0,0,.55)] sm:rounded-[28px] sm:p-7" style={{ animation: 'pop .4s cubic-bezier(.2,.8,.2,1) both' }}>
        <button type="button" onClick={close} aria-label="Close" className="absolute end-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-[#f5f5f7] hover:bg-[#ececf0]">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 pe-10">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-[#2a1d05]" style={{ background: 'var(--gold-grad)' }}>
            <Emblem className="h-7 w-7" />
          </span>
          <p className="eyebrow">{offer.eyebrow}</p>
        </div>
        <h2 className="mt-4 font-display text-[1.45rem] font-semibold leading-snug tracking-[-0.02em]">{offer.title}</h2>
        {offer.lead && <p className="muted mt-2 text-sm leading-relaxed">{offer.lead}</p>}

        <ul className="mt-5 grid gap-2">
          {offer.packages.map((p, i) => {
            const active = selected === i;
            return (
              <li key={i}>
                <button type="button" onClick={() => setSelected(i)} aria-pressed={active} className={cn('w-full rounded-2xl border p-4 text-start transition', active ? 'border-gold bg-[#fffaf0] shadow-[0_0_0_3px_rgba(201,162,74,.16)]' : 'border-black/[0.08] hover:border-black/20')}>
                  <span className="flex items-start gap-2.5">
                    <span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border', active ? 'border-gold bg-gold' : 'border-black/20')}>{active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-sm font-semibold leading-snug">
                        {i === 0 && <Zap className="h-3.5 w-3.5 shrink-0 text-gold-deep" />}
                        {p.name}
                      </span>
                      <span className="muted mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <span>{offer.govtLabel}</span>
                        <span className="ltr text-end font-medium text-[#1d1d1f]">
                          <Dirham />
                          {p.govt}
                        </span>
                        <span>{p.pickup ? offer.ourLabel : offer.ourLabelPlain}</span>
                        <span className="ltr text-end font-medium text-[#1d1d1f]">
                          <Dirham />
                          {p.fee}
                        </span>
                        {!p.pickup && (
                          <span className="col-span-2 flex items-center gap-1 text-[11px]">
                            <Minus className="h-3 w-3" /> {offer.noPickup}
                          </span>
                        )}
                      </span>
                      <span className="mt-2 flex items-center justify-between border-t border-black/[0.06] pt-2">
                        <span className="text-xs font-medium">{offer.totalLabel}</span>
                        <span className="ltr font-display text-lg font-semibold text-gold-deep">
                          <Dirham />
                          {p.price}
                        </span>
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {bullets.length > 0 && (
          <ul className="mt-5 grid gap-2 text-sm">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-center gap-2">
                {i === 1 ? <ShieldCheck className="h-4 w-4 text-gold-deep" /> : <Check className="h-4 w-4 text-gold-deep" />}
                {b}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {offer.cta?.label && (
            <SmartLink href={offer.cta.href} onClick={close} className="btn btn-dark">
              {offer.cta.label}
            </SmartLink>
          )}
          <a href={wa} target="_blank" rel="noopener noreferrer" onClick={close} className="btn bg-[#25D366] text-white">
            <SocialIcon name="whatsapp" className="h-4 w-4" />
            {offer.waLabel}
          </a>
        </div>
        {offer.note && (
          <p className="muted mt-4 flex items-center justify-center gap-1.5 text-xs">
            <Clock3 className="h-3.5 w-3.5" /> {offer.note}
          </p>
        )}
      </div>
    </div>
  );
}
