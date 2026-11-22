'use client';

// "Confirming your payment" → "Payment received": checks the provider every 2 seconds until confirmed.
import { useEffect, useState } from 'react';
import { coinImg, fullLogo } from '@/adgv/components/BrandLogo';
import { Icon } from '@/adgv/components/Icon';

type P = { token: string; pid: string; sid: string; gwRef: string; failed: boolean; initial: 'paid' | 'pending'; customer: string; amount: number; label: string; appRef: string; receipt?: string; paidAt?: string; reference: string };
const fmt = (iso?: string) => new Date(iso || Date.now()).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' });

export function PayConfirm(p: P) {
  const [state, setState] = useState<'paid' | 'pending' | 'failed' | 'slow'>(p.failed ? 'failed' : p.initial);
  const [rc, setRc] = useState({ receipt: p.receipt, at: p.paidAt });
  useEffect(() => {
    if (state === 'paid' || state === 'failed') return;
    let n = 0, stop = false;
    const tick = async () => {
      if (stop) return;
      n++;
      try {
        const r = await fetch(`/api/pay/status/?token=${encodeURIComponent(p.token)}&pid=${encodeURIComponent(p.pid)}&sid=${encodeURIComponent(p.sid)}&ref=${encodeURIComponent(p.gwRef)}`, { cache: 'no-store' });
        const j = await r.json();
        if (j.state === 'paid') { setRc({ receipt: j.receipt, at: j.at }); setState('paid'); return; }
        if (j.state === 'failed') { setState('failed'); return; }
      } catch {}
      if (n === 45) setState('slow');
      setTimeout(tick, n < 15 ? 2000 : 5000);
    };
    void tick();
    return () => { stop = true; };
  }, [state, p.token, p.pid, p.sid, p.gwRef]);

  const paid = state === 'paid';
  return (
    <main className="paywrap">
      <div className={`paycard ${state}`}>
        <div className="paytop"><img src={coinImg()} alt="" width={44} height={44} /><span>Abu Dhabi Golden Visa</span></div>
        <div className="paybody">
          {paid ? (
            <div className="pay-ok" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M15 27l7 7 15-16" /></svg></div>
          ) : state === 'failed' ? <div className="pay-x" aria-hidden="true">!</div> : <div className="pay-spin" aria-hidden="true" />}
          <h1>{paid ? 'Payment received' : state === 'failed' ? 'Payment not completed' : 'Confirming your payment'}</h1>
          <p className="muted" role="status" aria-live="polite">
            {paid ? 'Thank you! Your payment is confirmed. Your receipt is ready and we have sent it to you on WhatsApp.'
              : state === 'failed' ? 'The payment was declined or cancelled. No money was taken. You can try again or contact your advisor.'
              : state === 'slow' ? 'This is taking longer than usual. You can leave this page; we confirm on WhatsApp as soon as the bank answers.'
              : 'Your payment details were submitted and we are confirming the result now. This page updates itself in a moment.'}
          </p>
          <dl className="paydl">
            <div><dt>Customer</dt><dd>{p.customer}</dd></div>
            <div><dt>For</dt><dd>{p.label}</dd></div>
            <div><dt>Amount</dt><dd className="amt">AED {p.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div>
            <div><dt>Date</dt><dd>{fmt(paid ? rc.at : undefined)}</dd></div>
            <div><dt>Reference</dt><dd>{paid && rc.receipt ? rc.receipt : p.reference}</dd></div>
          </dl>
          <div className="paybtns">
            {paid && <a className="btn btn-gold" href={`../../../receipt/${p.pid}/pdf/`} target="_blank" rel="noopener">Download receipt (PDF)</a>}
            {state === 'failed' && <a className="btn btn-gold" href="../">Try again</a>}
            <a className={`btn ${paid ? 'btn-glass' : 'btn-gold'}`} href="../../../">Back to my application {p.appRef}</a>
          </div>
        </div>
        <p className="payfoot"><Icon name="lock" size={14} className="ei" /> Secure card payment · {p.appRef}</p>
      </div>
    </main>
  );
}
