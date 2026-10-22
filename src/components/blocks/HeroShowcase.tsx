'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCheck, Briefcase, Globe, GraduationCap, HeartHandshake, Plane, ShieldCheck, TrendingUp, Users, Wallet } from 'lucide-react';
import { Emblem } from '@/components/site/Logo';
import { cn } from '@/lib/utils';
import HeroDeck, { type DeckSlide } from './HeroDeck';

const ICONS = [TrendingUp, Wallet, GraduationCap, Users, ShieldCheck, BadgeCheck, Plane, HeartHandshake, Briefcase, Globe];

/**
 * Home hero: the gold visa card "plays" like a short video — it turns and shows each
 * feature in turn while the matching chip beside it lights up. Pauses off screen.
 */
export default function HeroShowcase({ left, right, eyebrow, title, sub, slides = [] }: { left: string[]; right: string[]; eyebrow?: string; title?: string; sub?: string; slides?: DeckSlide[] }) {
  const deck = slides.filter((x) => x && (x.title || x.image));
  const features = [...left, ...right];
  const count = 1 + features.length; // slide 0 = the card's own title
  const [i, setI] = useState(0);
  const [run, setRun] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const nf = features.length;
  const onDeck = useCallback((k: number) => setI(nf ? (k % nf) + 1 : 0), [nf]);

  useEffect(() => {
    const el = ref.current;
    if (!el || deck.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      setRun(visible);
    });
    io.observe(el);
    const id = window.setInterval(() => {
      if (visible && !document.hidden) setI((x) => (x + 1) % count);
    }, 2600);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, [count, deck.length]);

  const f = i > 0 ? features[i - 1] : null;
  const Ico = ICONS[(i - 1 + ICONS.length) % ICONS.length];
  const chip = (t: string, k: number, side: 'l' | 'r') => {
    const on = i - 1 === k;
    return (
      <li
        key={k}
        onMouseEnter={() => setI(k + 1)}
        className={cn('fx-up hs-chip glass flex cursor-default items-center gap-3 rounded-2xl px-4 py-3 text-[0.9rem] font-medium text-[#1d1d1f]', side === 'l' && 'lg:flex-row-reverse lg:text-end', on && 'is-on')}
        style={{ ['--d' as any]: `${0.45 + (k % 4) * 0.07}s` }}
      >
        <span className="dot-gold" />
        <span className="min-w-0 flex-1">{t}</span>
      </li>
    );
  };

  return (
    <div ref={ref} className="container-x relative mt-12 grid items-center gap-5 sm:mt-16 lg:grid-cols-[1fr_minmax(0,480px)_1fr] lg:gap-8">
      <ul className="order-2 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:order-1 lg:grid-cols-1">{left.map((t, k) => chip(t, k, 'l'))}</ul>
      {deck.length ? (
        <div className="fx-pop order-1 lg:order-2" style={{ ['--d' as any]: '.3s' }}>
          <HeroDeck slides={deck} onIndex={onDeck} />
        </div>
      ) : (
      <div className="card3d-wrap fx-pop order-1 lg:order-2" style={{ ['--d' as any]: '.3s' }}>
          <div className="tilt relative rounded-[26px]" data-tilt="16">
            <div className="card3d">
              <div key={i} className="hs-turn relative flex h-full flex-col justify-between p-5 text-start sm:p-6" style={{ transform: 'translateZ(40px)' }}>
                <div className="flex items-start justify-between">
                  <Emblem className="h-11 w-11 text-[#3b2a08]" />
                  {f ? (
                    <span className="hs-ico">
                      <Ico className="h-5 w-5" />
                    </span>
                  ) : (
                    <span className="chip" />
                  )}
                </div>
                <div className="hs-text">
                  {f ? (
                    <>
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-[#3b2a08]/70">
                        {String(i).padStart(2, '0')} / {String(features.length).padStart(2, '0')}
                      </p>
                      <p className="mt-1 text-[1.35rem] font-semibold leading-[1.05] tracking-[-0.01em] text-[#1a1406] sm:text-[1.6rem]">{f}</p>
                    </>
                  ) : (
                    <>
                      {eyebrow && <p className="text-[0.62rem] font-semibold uppercase tracking-[0.3em] text-[#3b2a08]/70">{eyebrow}</p>}
                      {title && <p className="mt-1 text-[1.55rem] font-semibold uppercase leading-none tracking-[-0.01em] text-[#1a1406] sm:text-[1.8rem]">{title}</p>}
                      {sub && <p className="mt-1.5 text-xs font-medium text-[#3b2a08]/75">{sub}</p>}
                    </>
                  )}
                </div>
              </div>
              {/* video-style progress */}
              <div className="hs-bar" aria-hidden>
                {Array.from({ length: count }).map((_, k) => (
                  <span key={k} className={cn(k < i && 'is-done', k === i && 'is-now', !run && 'is-paused')} />
                ))}
              </div>
            </div>
          </div>
          <div className="card3d-shadow" />
        </div>
      )}
      <ul className="order-3 grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 lg:grid-cols-1">{right.map((t, k) => chip(t, k + left.length, 'r'))}</ul>
    </div>
  );
}
