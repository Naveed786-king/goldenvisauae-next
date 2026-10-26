'use client';
import { useEffect, useRef, useState } from 'react';
import { Calculator as CalcIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const KEYS = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '=', '+'];
// little "sums" the device types by itself: government fee + our fee = total
const SUMS: [string, string][] = [
  ['9978', '5250'],
  ['4215', '1575'],
  ['9978', '1575'],
  ['3895', '1575'],
];
const fmt = (s: string) => (s ? Number(s).toLocaleString('en-US') : '0');

/** Calculator picture that keeps pressing its own keys while the amount on the screen changes */
export default function CalcDevice({ label = 'Golden Visa' }: { label?: string }) {
  const [screen, setScreen] = useState('11553');
  const [op, setOp] = useState('');
  const [pressed, setPressed] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    // build the key sequence: a, +, b, =, (pause)
    const steps: { key: string; apply: () => void }[] = [];
    SUMS.forEach(([a, b]) => {
      let cur = '';
      a.split('').forEach((d) => steps.push({ key: d, apply: () => { cur = cur + d; setOp(''); setScreen(cur); } }));
      steps.push({ key: '+', apply: () => setOp('+') });
      let cur2 = '';
      b.split('').forEach((d) => steps.push({ key: d, apply: () => { cur2 = cur2 + d; setScreen(cur2); } }));
      steps.push({ key: '=', apply: () => { setOp(''); setScreen(String(Number(a) + Number(b))); } });
      steps.push({ key: '', apply: () => {} });
      steps.push({ key: '', apply: () => {} });
      steps.push({ key: '', apply: () => { cur = ''; cur2 = ''; } });
    });
    let i = 0;
    const id = window.setInterval(() => {
      if (!visible || document.hidden) return;
      const s = steps[i % steps.length];
      i++;
      s.apply();
      const k = s.key ? KEYS.indexOf(s.key) : -1;
      setPressed(k >= 0 ? k : null);
      window.setTimeout(() => setPressed(null), 220);
    }, 420);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, []);

  return (
    <div ref={ref} className="ink-panel calc-device !rounded-[28px] p-5" style={{ transform: 'rotateX(8deg) rotateY(-12deg)' }}>
      <div className="calc-screen flex items-baseline justify-end gap-2 rounded-2xl bg-white/5 px-4 py-5 font-display text-3xl font-semibold tabular-nums text-white" dir="ltr">
        {op && <span className="text-xl text-[#a8812f]">{op}</span>}
        <span className="accent">AED</span>
        <span key={screen} className="calc-num">{fmt(screen)}</span>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2" dir="ltr">
        {KEYS.map((k, i) => (
          <span key={i} className={cn('calc-key grid h-11 place-items-center rounded-xl text-sm font-medium', k === '=' ? 'text-[#1a1406]' : 'bg-white/[0.07] text-white/80', pressed === i && 'is-press')} style={k === '=' ? { background: 'var(--gold-grad)' } : undefined}>
            {k}
          </span>
        ))}
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-[0.7rem] uppercase tracking-[0.2em] text-white/40">
        <CalcIcon className="h-3.5 w-3.5" /> {label}
      </p>
    </div>
  );
}
