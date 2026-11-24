'use client';
// "Confirming your payment" → "Payment received" on the client dashboard address: asks every few seconds until confirmed.
import { useEffect, useState } from 'react';

type P = { token: string; pid: string; initial: 'paid' | 'pending' | 'failed'; brand: string; coin: string; customer: string; label: string; amount: string; appRef: string; receiptNo: string; paidAt: string; file: string };
const fmt = (iso?: string) => new Date(iso || Date.now()).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' });

export function PayResult(p: P) {
  const [state, setState] = useState<'paid' | 'pending' | 'failed' | 'slow'>(p.initial);
  const [receipt, setReceipt] = useState(p.receiptNo);
  const [at, setAt] = useState(p.paidAt);
  useEffect(() => {
    if (state === 'paid' || state === 'failed') return;
    let n = 0;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      n++;
      try {
        const r = await fetch(`/api/portal/${encodeURIComponent(p.token)}/pay/${encodeURIComponent(p.pid)}/status`, { cache: 'no-store' });
        const j = await r.json();
        if (j.state === 'paid') {
          setReceipt(j.receiptNo || '');
          setAt(new Date().toISOString());
          setState('paid');
          return;
        }
        if (j.state === 'failed' || j.state === 'cancelled' || j.state === 'canceled') {
          setState('failed');
          return;
        }
      } catch {
        /* offline for a moment: ask again */
      }
      if (n === 45) setState('slow');
      setTimeout(tick, n < 15 ? 2000 : 5000);
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [state, p.token, p.pid]);
  const paid = state === 'paid';
  return (
    <main className="paywrap">
      <div className={`paycard ${state}`}>
        <div className="paytop">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.coin} alt="" width={44} height={44} />
          <span>{p.brand}</span>
        </div>
        <div className="paybody">
          {paid ? (
            <div className="pay-ok" aria-hidden="true">
              <svg viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="24" />
                <path d="M15 27l7 7 15-16" />
              </svg>
            </div>
          ) : state === 'failed' ? (
            <div className="pay-x" aria-hidden="true">!</div>
          ) : (
            <div className="pay-spin" aria-hidden="true" />
          )}
          <h1>{paid ? 'Payment received' : state === 'failed' ? 'Payment not completed' : 'Confirming your payment'}</h1>
          <p className="muted" role="status" aria-live="polite">
            {paid
              ? 'Thank you! Your payment is confirmed and your receipt is ready.'
              : state === 'failed'
                ? 'The payment was declined or cancelled. No money was taken. You can try again or contact your advisor.'
                : state === 'slow'
                  ? 'This is taking longer than usual. You can leave this page; we confirm on WhatsApp as soon as the bank answers.'
                  : 'Your payment details were submitted and we are confirming the result now. This page updates itself in a moment.'}
          </p>
          <dl className="paydl">
            <div>
              <dt>Customer</dt>
              <dd>{p.customer}</dd>
            </div>
            <div>
              <dt>For</dt>
              <dd>{p.label}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd className="amt">{p.amount}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{fmt(paid ? at || undefined : undefined)}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>{paid && receipt ? receipt : p.appRef}</dd>
            </div>
          </dl>
          <div className="paybtns">
            {paid && (
              <a className="btn btn-gold" href={`${p.file}/receipt/${p.pid}/pdf`} target="_blank" rel="noopener">
                Download receipt (PDF)
              </a>
            )}
            {state === 'failed' && (
              <a className="btn btn-gold" href={`${p.file}/pay/${p.pid}/card`}>
                Try again
              </a>
            )}
            <a className={`btn ${paid ? 'btn-glass' : 'btn-gold'}`} href={p.file}>
              Back to my application {p.appRef}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
