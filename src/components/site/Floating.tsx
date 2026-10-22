'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp, X, Phone, House, LayoutGrid, Calculator, Menu } from 'lucide-react';
import type { SiteSettings } from '@/lib/defaults';
import { SocialIcon } from '@/components/ui/Icon';
import { resolveHref } from '@/components/ui/href';
import SmartLink from '@/components/ui/SmartLink';
import { splitLocale } from '@/lib/i18n/config';
import { openCalculator } from '@/components/blocks/Interactive';
import { useT } from './SiteProvider';
import { MENU_EVENT } from './Header';

/** WhatsApp bubble, calculator side tab, back-to-top and the mobile bottom navigation bar */
export default function Floating({ site }: { site: SiteSettings }) {
  const t = useT();
  const path = splitLocale(usePathname() || '/').path;
  const [show, setShow] = useState(false);
  const [bubble, setBubble] = useState(false);
  const [panel, setPanel] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    // a short greeting on larger screens only (on phones it would cover the page)
    let hide = 0;
    const tm = setTimeout(() => {
      try {
        if (window.matchMedia('(max-width: 767px)').matches || sessionStorage.getItem('wa-bubble')) return;
        setBubble(true);
        hide = window.setTimeout(() => setBubble(false), 8000);
      } catch {}
    }, 9000);
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(tm);
      clearTimeout(hide);
    };
  }, []);

  const closeBubble = () => {
    setBubble(false);
    try {
      sessionStorage.setItem('wa-bubble', '1');
    } catch {}
  };
  const wa = resolveHref('whatsapp', site);
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <>
      {/* calculator tab on the side (desktop) */}
      <button type="button" onClick={openCalculator} className="glass fixed end-0 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-s-2xl px-2.5 py-4 text-[0.72rem] font-medium text-[#1d1d1f] transition hover:pe-4 lg:flex" aria-label={t('Cost calculator')}>
        <span className="grid h-9 w-9 place-items-center rounded-xl text-[#1a1406]" style={{ background: 'var(--gold-grad)' }}>
          <Calculator className="h-4 w-4" />
        </span>
        <span className="[writing-mode:vertical-rl] rotate-180 tracking-wide">{t('Cost calculator')}</span>
      </button>

      {site.showWhatsappButton && (
        <div className="fixed bottom-[96px] end-4 z-50 flex flex-col items-end gap-3 lg:bottom-6 lg:end-6">
          {(bubble || panel) && (
            <div className="relative w-[17rem] rounded-3xl bg-white p-5 shadow-[0_30px_70px_-25px_rgba(0,0,0,.45)] ring-1 ring-black/5" style={{ animation: 'pop .35s cubic-bezier(.2,.8,.2,1) both' }}>
              <button onClick={() => { closeBubble(); setPanel(false); }} className="absolute end-3 top-3 grid h-7 w-7 place-items-center rounded-full text-[#8e8e93] hover:bg-black/5" aria-label={t('Close')}>
                <X className="h-4 w-4" />
              </button>
              <p className="font-display text-[0.98rem] font-semibold">{t('Talk to a consultant')}</p>
              <p className="muted mt-1 text-xs leading-relaxed">{t('Typically replies within 5 minutes')}{site.hours ? `, ${site.hours}` : ''}.</p>
              <div className="mt-4 grid gap-2">
                <a href={wa} target="_blank" rel="noopener noreferrer" onClick={closeBubble} className="btn btn-sm bg-[#25D366] text-white">
                  <SocialIcon name="whatsapp" className="h-4 w-4" /> {t('WhatsApp us')}
                </a>
                <a href={`tel:${site.phone}`} className="btn btn-outline btn-sm">
                  <Phone className="h-4 w-4" /> <span className="ltr">{site.phoneDisplay}</span>
                </a>
              </div>
            </div>
          )}
          <button type="button" onClick={() => { setPanel((v) => !v); closeBubble(); }} aria-label={t('Talk to a consultant')} className="relative grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_14px_34px_-10px_rgba(37,211,102,.75)] transition-transform hover:scale-105 active:scale-95">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366]/30 [animation-duration:2.8s]" />
            <SocialIcon name="whatsapp" className="relative h-7 w-7" />
          </button>
        </div>
      )}

      {show && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="glass fixed bottom-6 start-6 z-40 hidden h-11 w-11 place-items-center rounded-full text-[#1d1d1f] lg:grid" style={{ animation: 'pop .3s both' }} aria-label={t('Back to top')}>
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {site.showMobileBar && (
        <nav className="mnav lg:hidden" aria-label={t('Quick navigation')}>
          <SmartLink href="/" className={active('/') ? 'is-active' : ''}>
            <House className="h-[21px] w-[21px]" />
            <span>{t('Home')}</span>
          </SmartLink>
          <SmartLink href="/services" className={active('/services') ? 'is-active' : ''}>
            <LayoutGrid className="h-[21px] w-[21px]" />
            <span>{t('Services')}</span>
          </SmartLink>
          <button type="button" onClick={openCalculator} className="mnav-cta" aria-label={t('Cost calculator')}>
            <i>
              <Calculator className="h-5 w-5" />
            </i>
            <span>{t('Calculator')}</span>
          </button>
          <a href={wa} target="_blank" rel="noopener noreferrer">
            <SocialIcon name="whatsapp" className="h-[21px] w-[21px] text-[#25D366]" />
            <span>{t('WhatsApp')}</span>
          </a>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent(MENU_EVENT))}>
            <Menu className="h-[21px] w-[21px]" />
            <span>{t('Menu')}</span>
          </button>
        </nav>
      )}
    </>
  );
}
