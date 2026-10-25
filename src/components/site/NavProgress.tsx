'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Thin gold bar at the top of the screen: it starts the instant a link is tapped
 * (so a click always feels answered) and finishes when the new page is shown.
 */
export default function NavProgress() {
  const pathname = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  const timer = useRef(0);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('tel:') || href.startsWith('mailto:')) return;
      let url: URL;
      try {
        url = new URL(a.href, location.href);
      } catch {
        return;
      }
      if (url.origin !== location.origin || url.pathname.startsWith('/admin') || url.pathname.startsWith('/api')) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      el.classList.remove('is-done');
      el.classList.add('is-on');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => done(), 8000);
    };
    const done = () => {
      if (!el.classList.contains('is-on')) return;
      el.classList.add('is-done');
      window.setTimeout(() => el.classList.remove('is-on', 'is-done'), 380);
    };
    (el as any)._done = done;
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    window.clearTimeout(timer.current);
    (bar.current as any)?._done?.();
  }, [pathname]);

  return <div ref={bar} className="nav-progress" aria-hidden />;
}
