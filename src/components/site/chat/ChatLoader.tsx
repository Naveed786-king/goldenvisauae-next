'use client';
// Loads the chat widget only after the page is idle (or on first interaction) — no effect on page speed.
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const ChatWidget = dynamic(() => import('./ChatWidget'), { ssr: false });

export type ChatWidgetConfig = { botName: string; greeting: string; color: string; position: 'end' | 'start' };

export default function ChatLoader({ cfg }: { cfg: ChatWidgetConfig }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      setReady(true);
    };
    const w = window as any;
    const idle = w.requestIdleCallback ? w.requestIdleCallback(go, { timeout: 6000 }) : window.setTimeout(go, 3500);
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    return () => {
      if (w.cancelIdleCallback && typeof idle === 'number') w.cancelIdleCallback(idle);
      window.clearTimeout(idle);
      events.forEach((e) => window.removeEventListener(e, go));
    };
  }, []);
  return ready ? <ChatWidget cfg={cfg} /> : null;
}
