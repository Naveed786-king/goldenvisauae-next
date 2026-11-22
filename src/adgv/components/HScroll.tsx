'use client';

// Rows that scroll sideways (page-section chips, category tabs, step bars…) work with a mouse too:
// the mouse wheel scrolls them sideways and they can be dragged. Touch scrolling is left as it is.
import { useEffect } from 'react';

const isRow = (el: Element | null): el is HTMLElement => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.scrollWidth <= el.clientWidth + 2 || el.clientHeight > 140) return false;
  const o = getComputedStyle(el).overflowX;
  return o === 'auto' || o === 'scroll';
};
function rowOf(t: EventTarget | null) {
  let el = t instanceof Element ? t : null;
  for (let i = 0; el && i < 6; i++, el = el.parentElement) if (isRow(el)) return el;
  return null;
}

export function HScroll() {
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const r = rowOf(e.target);
      if (!r) return;
      const max = r.scrollWidth - r.clientWidth;
      if ((e.deltaY < 0 && r.scrollLeft <= 0) || (e.deltaY > 0 && r.scrollLeft >= max - 1)) return; // at the end: let the page scroll
      e.preventDefault();
      r.scrollBy({ left: e.deltaY * (e.deltaMode === 1 ? 32 : 1.2), behavior: 'auto' });
    };
    let drag: { el: HTMLElement; x: number; left: number; moved: boolean } | null = null;
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const r = rowOf(e.target);
      if (r) drag = { el: r, x: e.clientX, left: r.scrollLeft, moved: false };
    };
    const onMove = (e: MouseEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 6) return;
      drag.moved = true;
      drag.el.classList.add('hs-drag');
      drag.el.scrollLeft = drag.left - dx;
      e.preventDefault();
    };
    const onUp = () => {
      if (drag?.moved) {
        const el = drag.el;
        // swallow the click that ends a drag, so a chip is not opened by accident
        const stop = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); };
        el.addEventListener('click', stop, { capture: true, once: true });
        setTimeout(() => el.removeEventListener('click', stop, { capture: true }), 50);
        el.classList.remove('hs-drag');
      }
      drag = null;
    };
    // phones: hide the floating buttons while the page is moving, show them again when it stops
    let t: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => { document.body.classList.add('is-scrolling'); clearTimeout(t); t = setTimeout(() => document.body.classList.remove('is-scrolling'), 700); };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);
  return null;
}
