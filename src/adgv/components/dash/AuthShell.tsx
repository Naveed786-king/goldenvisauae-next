'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { coinImg, fullLogo } from '@/adgv/components/BrandLogo';

const SERVICES = ['Golden Visa', 'Family Visa', 'Valuation Certificate', 'Attestation', 'Emirates ID', 'Legal Translation', 'PRO Services', 'Retirement Visa'];

/** Split sign-in layout: rotating services and benefits on the left, the form on the right. */
export function AuthShell({ eyebrow, title, text, ticks, children, top }: { eyebrow: string; title: string; text: string; ticks: string[]; children: ReactNode; top?: ReactNode }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(SERVICES[i]); return; }
    const word = SERVICES[i];
    let k = 0, del = false;
    const id = window.setInterval(() => {
      if (!del) { k++; setShown(word.slice(0, k)); if (k >= word.length) { del = true; window.clearInterval(id); window.setTimeout(() => setI((x) => (x + 1) % SERVICES.length), 1600); } }
    }, 70);
    return () => window.clearInterval(id);
  }, [i]);
  return (
    <main className="auth">
      {top}
      <div className="auth-card">
        <section className="auth-left">
          <div className="auth-word" aria-hidden="true">{shown}<span className="caret" /></div>
          <img className="auth-coin" src={coinImg()} alt="" width={150} height={150} />
          <div>
            <p className="eyebrow line">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="auth-text">{text}</p>
            <ul className="auth-ticks">{ticks.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </section>
        <section className="auth-right">{children}</section>
      </div>
    </main>
  );
}
