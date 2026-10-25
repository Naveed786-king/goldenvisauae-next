'use client';
import { Children, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Scrolls a card to the middle (works the same in right-to-left pages) */
function centre(el: HTMLElement, k: HTMLElement) {
  const a = el.getBoundingClientRect();
  const b = k.getBoundingClientRect();
  // snapping stays on: the browser always lands exactly on the card (iPhone Safari left cards half-way when snap was paused)
  el.scrollBy({ left: Math.round(b.left + b.width / 2 - (a.left + a.width / 2)), behavior: 'smooth' });
}

/**
 * On phones: a swipeable 3D carousel (cards turn and shrink as they leave the centre,
 * dots, gentle autoplay that stops as soon as the visitor touches it).
 * On tablets and desktop: the normal grid given in `className`.
 */
export default function Slider3D({
  children,
  className,
  as: Tag = 'div',
  autoplay = true,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'ul' | 'ol';
  autoplay?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [mobile, setMobile] = useState(false);
  const count = Children.count(children);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !mobile) {
      el && Array.from(el.children).forEach((c) => (c as HTMLElement).style.removeProperty('--s3d'));
      return;
    }
    let raf = 0;
    const paint = () => {
      raf = 0;
      const box = el.getBoundingClientRect();
      const mid = box.left + box.width / 2;
      let best = 0;
      let bestD = Infinity;
      Array.from(el.children).forEach((c, i) => {
        const r = (c as HTMLElement).getBoundingClientRect();
        const d = Math.max(-1.6, Math.min(1.6, (r.left + r.width / 2 - mid) / r.width));
        (c as HTMLElement).style.setProperty('--s3d', d.toFixed(3));
        if (Math.abs(d) < bestD) {
          bestD = Math.abs(d);
          best = i;
        }
      });
      setActive(best);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    paint();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // autoplay only while visible and untouched
    let timer = 0;
    let stopped = !autoplay || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let visible = false;
    const stop = () => {
      stopped = true;
      window.clearInterval(timer);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.intersectionRatio > 0.55;
        if (e.isIntersecting) onScroll();
      },
      { threshold: [0, 0.6] },
    );
    io.observe(el);
    if (!stopped)
      timer = window.setInterval(() => {
        if (!visible || stopped || document.hidden) return;
        const kids = Array.from(el.children) as HTMLElement[];
        const cur = kids.findIndex((k) => Math.abs(parseFloat(k.style.getPropertyValue('--s3d') || '0')) < 0.5);
        const next = kids[(cur + 1) % kids.length];
        if (next) centre(el, next);
      }, 5200);
    el.addEventListener('pointerdown', stop, { once: true });
    el.addEventListener('touchstart', stop, { once: true, passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.clearInterval(timer);
      io.disconnect();
    };
  }, [mobile, autoplay, count]);

  const go = (i: number) => {
    const el = ref.current;
    const k = el?.children[i] as HTMLElement | undefined;
    if (el && k) centre(el, k);
  };

  return (
    <>
      <Tag ref={ref as any} className={cn('s3d', className)} aria-label={label} data-s3d={mobile ? '' : undefined}>
        {children}
      </Tag>
      {mobile && count > 1 && (
        <div className="s3d-dots" role="tablist">
          {Array.from({ length: count }).map((_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === active} aria-label={`${i + 1} / ${count}`} onClick={() => go(i)} className={cn(i === active && 'is-on')} />
          ))}
        </div>
      )}
    </>
  );
}
