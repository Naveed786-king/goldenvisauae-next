'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X, Phone, User, ArrowRight, Calculator, Check } from 'lucide-react';
import type { HeaderSettings, SiteSettings } from '@/lib/defaults';
import { cn } from '@/lib/utils';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import { useT, useLocalize } from './SiteProvider';
import { splitLocale } from '@/lib/i18n/config';
import SmartLink from '@/components/ui/SmartLink';
import { Icon } from '@/components/ui/Icon';
import { openCalculator } from '@/components/blocks/Interactive';

type Me = { name: string; role: string } | null;
export const MENU_EVENT = 'open-site-menu';

export default function Header({ site, header }: { site: SiteSettings; header: HeaderSettings }) {
  const fullPath = usePathname() || '/';
  const pathname = splitLocale(fullPath).path;
  const t = useT();
  const L = useLocalize();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState<number | null>(null);
  const [me, setMe] = useState<Me>(null);
  const closeTimer = useRef<number | null>(null);

  const [hidden, setHidden] = useState(false);
  // 0 = everything fits, 1 = compact (coin logo, tighter menu), 2 = menu moves into the ☰ button
  const [fit, setFit] = useState(0);
  const islandRef = useRef<HTMLDivElement>(null);
  const labels = header.menu.map((m) => m.label).join('|');
  useEffect(() => {
    const isl = islandRef.current;
    if (!isl) return;
    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (window.innerWidth < 1024) return setFit(0);
        const tight = () => {
          const nav = isl.querySelector<HTMLElement>('.site-nav');
          const logo = isl.querySelector<HTMLElement>('.site-logo');
          const acts = isl.querySelector<HTMLElement>('.hdr-actions');
          if (!nav || !logo || !acts) return false;
          const rtl = document.documentElement.dir === 'rtl';
          const n = nav.getBoundingClientRect(), l = logo.getBoundingClientRect(), a = acts.getBoundingClientRect();
          const navW = Array.from(nav.children).reduce((w, c) => w + (c as HTMLElement).getBoundingClientRect().width, 0);
          const avail = isl.clientWidth - l.width - a.width - 56;
          const out = isl.scrollWidth > isl.clientWidth + 1;
          return out || navW > avail || (rtl ? n.right > l.left - 6 : n.left < l.right + 6);
        };
        for (const f of [0, 1, 2]) {
          isl.parentElement?.setAttribute('data-fit', String(f));
          if (f === 2 || !tight()) return setFit(f);
        }
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(isl);
    // the menu words themselves (a language switch changes their length without resizing the window)
    const nav = isl.querySelector('.site-nav');
    if (nav) for (const c of Array.from(nav.children)) ro.observe(c);
    const acts = isl.querySelector('.hdr-actions');
    if (acts) ro.observe(acts);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [labels]);
  useEffect(() => {
    let raf = 0;
    let last = window.scrollY;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 16);
        // hide while scrolling down a page, show again as soon as the visitor scrolls up
        if (Math.abs(y - last) > 6) {
          setHidden(y > 220 && y > last);
          last = y;
        }
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const openMenu = () => setOpen(true);
    window.addEventListener(MENU_EVENT, openMenu);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener(MENU_EVENT, openMenu);
    };
  }, []);

  useEffect(() => {
    setOpen(false);
    setDrop(null);
  }, [pathname]);

  useEffect(() => {
    if (!header.showLogin) return;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user || null))
      .catch(() => {});
  }, [header.showLogin, pathname]);

  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrop(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const mega = header.mega?.enabled && header.mega.groups?.length ? header.mega : null;
  const isMega = (href: string) => !!mega && href === mega.attachTo;
  const isActive = (href: string) => (href === '/' ? pathname === '/' : !!pathname?.startsWith(href));
  const accountHref = me ? (me.role === 'CUSTOMER' ? '/account' : '/admin') : L('/login');
  const enter = (i: number | null) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setDrop(i);
  };
  const leave = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setDrop(null), 220);
  };

  return (
    <>
      <header className="site-header" data-fit={fit} data-scrolled={scrolled ? '' : undefined} data-hidden={hidden && !open && drop === null ? '' : undefined}>
        {header.topbar.enabled && header.topbar.text && (
          <div className={cn('topbar transition-all duration-500', scrolled && 'pointer-events-none !my-0 !min-h-0 !py-0 h-0 opacity-0')}>
            <span className="dot-gold" />
            <span className="truncate">{header.topbar.text}</span>
            {header.topbar.linkLabel && (
              <SmartLink href={header.topbar.linkHref} className="inline-flex items-center gap-1 hover:underline">
                {header.topbar.linkLabel} <ArrowRight className="h-3.5 w-3.5" />
              </SmartLink>
            )}
          </div>
        )}
        <div ref={islandRef} className="hdr-island" onMouseLeave={leave}>
          <span aria-hidden className="hdr-progress" />
          <span aria-hidden className="hdr-sheen" />
          <Logo src={site.logo} name={site.name} tagline={site.tagline} />

          <nav className="site-nav ms-auto hidden items-center gap-0.5 lg:flex" aria-label="Main">
            {header.menu.map((item, i) => {
              const hasDrop = !!item.children?.length || isMega(item.href);
              return (
                <div key={i} className={isMega(item.href) ? '' : 'relative'} onMouseEnter={() => enter(hasDrop ? i : null)}>
                  <SmartLink href={item.href} className="nav-link flex items-center gap-1 whitespace-nowrap" data-active={isActive(item.href) ? '' : undefined}>
                    {item.label}
                    {hasDrop && <ChevronDown className={cn('h-3.5 w-3.5 opacity-50 transition-transform', drop === i && 'rotate-180')} />}
                  </SmartLink>
                  {drop === i && !isMega(item.href) && item.children?.length ? (
                    <div className="absolute start-1/2 top-full w-[340px] -translate-x-1/2 pt-3 rtl:translate-x-1/2" onMouseEnter={() => enter(i)}>
                      <div className="glass-menu mega-panel rounded-2xl p-2">
                        {item.children.map((c, j) => (
                          <SmartLink key={j} href={c.href} className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-black/[0.04]">
                            <span className="icon-chip !h-9 !w-9 !rounded-xl">
                              <Icon name={c.icon || 'badge'} className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[0.9rem] font-medium">{c.label}</span>
                              {c.description && <span className="muted mt-0.5 block text-xs">{c.description}</span>}
                            </span>
                          </SmartLink>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>

          <div className="hdr-actions ms-auto flex shrink-0 items-center gap-1 lg:ms-3">
            <LanguageSwitcher />
            {header.showLogin && (
              <Link href={accountHref} className="hidden h-10 w-10 place-items-center rounded-xl text-[#1d1d1f] transition hover:bg-black/[0.045] md:grid" aria-label={me ? t('My account') : t('Client login')} title={me ? me.name : t('Client login')}>
                <User className="h-[18px] w-[18px]" />
              </Link>
            )}
            {header.cta.label && (
              <SmartLink href={header.cta.href} className="btn btn-dark btn-sm ms-1 hidden sm:inline-flex">
                {header.cta.label}
              </SmartLink>
            )}
            <button onClick={() => setOpen(true)} className="hdr-burger grid h-10 w-10 place-items-center rounded-xl text-[#1d1d1f] transition hover:bg-black/[0.045] lg:hidden" aria-label={t('Menu')} aria-expanded={open}>
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* services mega menu */}
          {mega && drop !== null && isMega(header.menu[drop]?.href) && (
            <div className="absolute inset-x-0 top-full hidden pt-3 lg:block" onMouseEnter={() => enter(drop)}>
              <div className="glass-menu mega-panel grid grid-cols-[0.8fr_2.2fr] gap-6 rounded-[24px] p-6">
                <div className="flex flex-col rounded-2xl bg-[linear-gradient(145deg,#fffaf0,#f7ecd0)] p-6">
                  {mega.eyebrow && <p className="eyebrow">{mega.eyebrow}</p>}
                  <p className="mt-3 font-display text-xl font-semibold leading-snug">{mega.title}</p>
                  {mega.text && <p className="muted mt-2 text-sm leading-relaxed">{mega.text}</p>}
                  {mega.bullets && (
                    <ul className="mt-4 space-y-1.5">
                      {mega.bullets
                        .split('\n')
                        .filter(Boolean)
                        .map((b, k) => (
                          <li key={k} className="flex items-center gap-2 text-[0.82rem]">
                            <Check className="h-3.5 w-3.5 text-gold-deep" /> {b}
                          </li>
                        ))}
                    </ul>
                  )}
                  <div className="mt-auto flex flex-col gap-2 pt-6">
                    {mega.allLabel && (
                      <SmartLink href={mega.allHref} className="btn btn-dark btn-sm">
                        {mega.allLabel} <ArrowRight className="h-4 w-4" />
                      </SmartLink>
                    )}
                    {mega.calculatorLabel && (
                      <button type="button" onClick={() => { setDrop(null); openCalculator(); }} className="btn btn-outline btn-sm">
                        <Calculator className="h-4 w-4" /> {mega.calculatorLabel}
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                  {mega.groups.map((g, gi) => (
                    <div key={gi} className="min-w-0">
                      <p className="px-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#8a6d2c]">{g.title}</p>
                      <ul className="mt-2 space-y-0.5">
                        {g.links.map((c, j) => (
                          <li key={j}>
                            <SmartLink href={c.href} onClick={() => setDrop(null)} className="group flex items-center gap-2.5 rounded-xl px-2 py-2 text-[0.88rem] transition-colors hover:bg-black/[0.04]">
                              <Icon name={c.icon || 'check'} className="h-4 w-4 shrink-0 text-gold-deep transition-transform group-hover:scale-110" />
                              <span className="min-w-0">{c.label}</span>
                            </SmartLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* mobile & tablet menu — a bottom sheet (easy to reach with the thumb) */}
      {open && (
        <div className={cn(fit < 2 && 'lg:hidden')}>
          <div className="sheet-backdrop" onClick={() => setOpen(false)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label={t('Menu')}>
            <div className="sheet-grip" />
            <div className="flex items-center justify-between px-5 pb-3 pt-1">
              <Logo src={site.logo} name={site.name} tagline={site.tagline} />
              <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-[#f5f5f7]" aria-label={t('Close')}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="px-5" aria-label="Mobile">
              <ul className="grid grid-cols-2 gap-2">
                {header.menu.map((item, i) => (
                  <li key={i} style={{ animation: `pop .35s cubic-bezier(.2,.8,.2,1) ${i * 0.03}s both` }}>
                    <SmartLink href={item.href} className={cn('flex min-h-[52px] items-center rounded-2xl px-4 text-[0.95rem] font-medium', isActive(item.href) ? 'chip-active' : 'bg-[#f5f5f7] text-[#1d1d1f]')}>
                      {item.label}
                    </SmartLink>
                  </li>
                ))}
              </ul>
              {mega && (
                <div className="mt-6 space-y-5">
                  {mega.groups.map((g, gi) => (
                    <div key={gi}>
                      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#8a6d2c]">{g.title}</p>
                      <ul className="mt-2 grid gap-1">
                        {g.links.map((c, j) => (
                          <li key={j}>
                            <SmartLink href={c.href} className="flex items-center gap-3 rounded-xl py-2 text-[0.92rem] text-[#1d1d1f]">
                              <Icon name={c.icon || 'check'} className="h-4 w-4 shrink-0 text-gold-deep" />
                              {c.label}
                            </SmartLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-6">
                <LanguageSwitcher variant="sheet" />
              </div>
              <div className="mt-6 grid gap-2.5 pb-2">
                <SmartLink href={header.cta.href} className="btn btn-dark w-full">
                  {header.cta.label}
                </SmartLink>
                <a href={`tel:${site.phone}`} className="btn btn-outline w-full">
                  <Phone className="h-4 w-4" /> <span className="ltr">{site.phoneDisplay}</span>
                </a>
                {header.showLogin && (
                  <Link href={accountHref} className="flex items-center justify-center gap-2 py-2 text-sm text-[#3a3a3c]">
                    <User className="h-4 w-4 text-gold-deep" /> {me ? `${t('My account')} (${me.name})` : t('Client login / Register')}
                  </Link>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
