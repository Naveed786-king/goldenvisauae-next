'use client';
import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { Dirham } from './Dirham';

/** Animates numbers inside a string like "300+", "12+", "AED 2M" */
export default function Counter({ value, duration = 1.8, className }: { value: string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const match = String(value || '').match(/^(\D*)([\d,.]+)(.*)$/);
  const target = match ? parseFloat(match[2].replace(/,/g, '')) : 0;
  const [n, setN] = useState(target); // full value on the server (SEO / no-JS)

  useEffect(() => {
    if (!inView || !match) return;
    let raf = 0;
    setN(0);
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setN(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  if (!match) return <span className={className}>{value}</span>;
  const decimals = (match[2].split('.')[1] || '').length;
  const formatted = n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <span ref={ref} className={className} dir="ltr">
      {/^\s*AED\s?$/.test(match[1]) ? <Dirham /> : match[1]}
      {formatted}
      {match[3]}
    </span>
  );
}
