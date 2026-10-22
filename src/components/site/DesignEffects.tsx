'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Entrance animations for sections (Admin → section → Design → Animation), the smaller
 * ".reveal" parts inside them, and the 3D pointer tilt on ".tilt" cards.
 * - Everything is in the HTML and visible; only parts BELOW the screen are hidden once the page is ready.
 * - Parts start showing slightly before they reach the screen, and a scroll check also catches
 *   parts skipped by a fast swipe on a phone — so nothing ever stays blank.
 */
export default function DesignEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const off = !!document.querySelector('.anim-off') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('.blk[data-anim]'));
    const reveals = Array.from(document.querySelectorAll<HTMLElement>('.reveal')).filter((el) => !el.dataset.rv);
    const vh = () => window.innerHeight || document.documentElement.clientHeight;
    const onScreen = (el: HTMLElement, f = 1.02) => el.getBoundingClientRect().top < vh() * f;

    const pending = new Set<HTMLElement>();
    const show = (el: HTMLElement) => {
      if (!pending.has(el)) return;
      pending.delete(el);
      io.unobserve(el);
      if (el.classList.contains('blk')) el.classList.add('in');
      else {
        const box = el.parentElement;
        if (box?.hasAttribute('data-rv-stagger')) {
          const i = Array.prototype.indexOf.call(box.children, el);
          el.style.setProperty('--rv-d', `${Math.min(i, 6) * 0.06}s`);
        }
        el.dataset.rv = 'in';
      }
    };
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && show(e.target as HTMLElement)), {
      rootMargin: '0px 0px 8% 0px',
      threshold: 0,
    });

    for (const el of blocks) {
      if (off || onScreen(el)) el.classList.add('in');
      else pending.add(el);
    }
    for (const el of reveals) {
      if (off || onScreen(el)) el.dataset.rv = 'in';
      else {
        el.dataset.rv = 'wait';
        pending.add(el);
      }
    }
    root.setAttribute('data-anim-ready', '');
    pending.forEach((el) => io.observe(el));

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        pending.forEach((el) => onScreen(el, 1.1) && show(el));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
      pending.forEach((el) => (el.classList.contains('blk') ? el.classList.add('in') : (el.dataset.rv = 'in')));
    };
  }, [pathname]);

  // 3D tilt: one listener for the whole page (cheap), only with a mouse / trackpad
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let current: HTMLElement | null = null;
    let raf = 0;
    let ev: PointerEvent | null = null;
    const reset = (el: HTMLElement) => {
      el.style.removeProperty('--tx');
      el.style.removeProperty('--ty');
    };
    const apply = () => {
      raf = 0;
      if (!ev) return;
      const el = (ev.target as HTMLElement | null)?.closest?.('.tilt') as HTMLElement | null;
      if (current && current !== el) reset(current);
      current = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width;
      const y = (ev.clientY - r.top) / r.height;
      const max = Number(el.dataset.tilt || 7);
      el.style.setProperty('--tx', `${((x - 0.5) * max).toFixed(2)}deg`);
      el.style.setProperty('--ty', `${((0.5 - y) * max).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    };
    const onMove = (e: PointerEvent) => {
      ev = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onOut = (e: PointerEvent) => {
      const to = e.relatedTarget as HTMLElement | null;
      if (current && (!to || !current.contains(to))) {
        reset(current);
        current = null;
      }
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerout', onOut, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerout', onOut);
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
