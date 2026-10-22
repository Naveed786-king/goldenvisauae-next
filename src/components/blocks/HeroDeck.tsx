'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import SmartLink from '@/components/ui/SmartLink';
import { Emblem } from '@/components/site/Logo';
import { cn } from '@/lib/utils';

export type DeckSlide = { image?: string; eyebrow?: string; title?: string; sub?: string; tag?: string; link?: { label?: string; href?: string } };

const HOLD = 2900; // ms each card stays on top
const LEAVE = 520; // ms the top card takes to fly away

/**
 * A stack of tilted cards. The top card waits, gently swaying, then flies away to the
 * side while the next card straightens and comes forward — like a deck being dealt.
 * Swipe or drag the top card to deal it yourself. Pauses when off screen.
 */
export default function HeroDeck({ slides, onIndex }: { slides: DeckSlide[]; onIndex?: (i: number) => void }) {
  const n = slides.length;
  const [i, setI] = useState(0);
  const [leaving, setLeaving] = useState<{ k: number; dir: 1 | -1 } | null>(null);
  const [drag, setDrag] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; id: number; t: number } | null>(null);
  const busy = useRef(false);
  const iRef = useRef(0);

  const deal = useCallback(
    (dir: 1 | -1 = 1) => {
      if (busy.current || n < 2) return;
      busy.current = true;
      const cur = iRef.current;
      const next = dir === 1 ? (cur + 1) % n : (cur - 1 + n) % n;
      iRef.current = next;
      setLeaving({ k: cur, dir });
      setI(next);
      window.setTimeout(() => {
        setLeaving(null);
        busy.current = false;
      }, LEAVE);
    },
    [n],
  );

  useEffect(() => onIndex?.(i), [i, onIndex]);

  // autoplay while visible
  useEffect(() => {
    const el = ref.current;
    if (!el || n < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    const id = window.setInterval(() => {
      if (visible && !paused && !document.hidden && !start.current) deal(1);
    }, HOLD);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, [n, paused, deal]);

  // drag / swipe the top card
  const down = (e: React.PointerEvent) => {
    if (busy.current) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, t: Date.now() };
  };
  const move = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dx) < 10) return; // vertical scroll wins
    if (Math.abs(dx) > 6) (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag(dx);
  };
  const up = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const fast = Math.abs(dx) > 30 && Date.now() - s.t < 260;
    setDrag(0);
    if (Math.abs(dx) > 70 || fast) deal(dx < 0 ? 1 : -1);
  };

  if (!n) return null;
  const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
  return (
    <div className="deck-wrap" ref={ref} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="deck" role="region" aria-roledescription="carousel" aria-label="Golden Visa">
        {slides.map((s, k) => {
          const pos = (k - i + n) % n; // 0 = on top
          const isLeaving = leaving?.k === k;
          const style: React.CSSProperties & Record<string, any> = {};
          if (pos === 0 && drag) {
            style.transform = `translate3d(${drag}px, 0, 0) rotate(${-3 + drag / 18}deg)`;
            style.transition = 'none';
            style.animation = 'none';
          }
          if (isLeaving) style['--dir'] = (leaving!.dir === 1 ? -1 : 1) * (rtl ? -1 : 1);
          return (
            <article
              key={k}
              className={cn('deck-card', isLeaving ? 'is-leaving' : `p${Math.min(pos, 3)}`)}
              style={style}
              aria-hidden={pos !== 0}
              onPointerDown={pos === 0 ? down : undefined}
              onPointerMove={pos === 0 ? move : undefined}
              onPointerUp={pos === 0 ? up : undefined}
              onPointerCancel={pos === 0 ? up : undefined}
            >
              {s.image && <img src={s.image} alt="" draggable={false} loading={k < 2 ? 'eager' : 'lazy'} decoding="async" className="deck-img" />}
              <div className="deck-shade" />
              <div className="deck-body">
                <span className="deck-brand">
                  <Emblem className="h-4 w-4" />
                  {s.eyebrow}
                </span>
                {s.title && <p className="deck-title">{s.title}</p>}
                {s.sub && <p className="deck-sub">{s.sub}</p>}
                {s.tag && <p className="deck-tag">{s.tag}</p>}
                {s.link?.label && s.link.href && (
                  <SmartLink href={s.link.href} className="deck-cta" ariaLabel={s.link.label}>
                    {s.link.label} <ArrowRight className="h-3.5 w-3.5" />
                  </SmartLink>
                )}
              </div>
              <span className="deck-gloss" />
            </article>
          );
        })}
      </div>
      <div className="deck-dots" role="tablist">
        {slides.map((_, k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === i}
            aria-label={`${k + 1} / ${n}`}
            className={cn(k === i && 'is-on')}
            onClick={() => {
              if (k === i || busy.current) return;
              const fwd = (k - i + n) % n;
              const steps = fwd <= n / 2 ? fwd : fwd - n;
              const dir: 1 | -1 = steps > 0 ? 1 : -1;
              let left = Math.abs(steps);
              const step = () => {
                deal(dir);
                if (--left > 0) window.setTimeout(step, LEAVE + 20);
              };
              step();
            }}
          />
        ))}
      </div>
    </div>
  );
}
