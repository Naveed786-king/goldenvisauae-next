'use client';
import { useEffect, useState } from 'react';

import { isStaleVersion, STALE_RELOAD_KEY as KEY } from '@/lib/stale-version';

export default function RecoverableError({ error, reset, dark }: { error: Error & { digest?: string }; reset: () => void; dark?: boolean }) {
  const stale = isStaleVersion(error);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (!stale) return;
    let last = 0;
    try {
      last = Number(sessionStorage.getItem(KEY) || 0);
    } catch {}
    // once per minute at most, so a real fault can never cause a reload loop
    if (Date.now() - last > 60_000) {
      try {
        sessionStorage.setItem(KEY, String(Date.now()));
      } catch {}
      setReloading(true);
      window.location.reload();
    }
  }, [stale]);

  return (
    <div className={`grid min-h-[60vh] place-items-center px-4 ${dark ? 'bg-[#0b0b0c] text-white' : ''}`}>
      <div className="max-w-md text-center">
        <h2 className="text-2xl font-semibold">{stale || reloading ? 'Updating to the latest version…' : 'Something went wrong on this page'}</h2>
        <p className="mt-2 text-sm opacity-70">
          {stale ? 'The site was just updated. The page reloads by itself; if it does not, press Reload.' : 'Nothing was lost. Try again, or reload the page.'}
        </p>
        {error?.digest ? <p className="mt-2 text-xs opacity-50">Reference: {error.digest}</p> : null}
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={() => reset()} className="rounded-full border border-current/30 px-5 py-2 text-sm font-semibold">
            Try again
          </button>
          <button type="button" onClick={() => window.location.reload()} className="rounded-full bg-[#c9a24a] px-5 py-2 text-sm font-semibold text-black">
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
