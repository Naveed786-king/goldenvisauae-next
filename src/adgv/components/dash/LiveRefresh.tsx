'use client';

// Live tracking: checks the file every 15 seconds and refreshes the page when the team changes something.
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export function LiveRefresh({ token, stamp, label = 'Live' }: { token: string; stamp: string; label?: string }) {
  const router = useRouter();
  const last = useRef(stamp);
  const [at, setAt] = useState('');
  const [flash, setFlash] = useState(false);
  useEffect(() => { last.current = stamp; }, [stamp]);
  useEffect(() => {
    const tick = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(`/api/portal/pulse/?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        const j = await r.json();
        setAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        if (j.ok && j.stamp !== last.current) { last.current = j.stamp; setFlash(true); router.refresh(); setTimeout(() => setFlash(false), 2500); }
      } catch {}
    };
    void tick();
    const i = setInterval(tick, 15000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', tick); };
  }, [token, router]);
  return <span className={`live${flash ? ' flash' : ''}`} title="This page updates by itself"><i />{label}{at ? ` · ${at}` : ''}</span>;
}
