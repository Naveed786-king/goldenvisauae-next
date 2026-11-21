'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, XCircle, Download } from 'lucide-react';

/** "Confirming your payment": asks the server (which asks the provider) every few seconds */
export default function PayConfirm(props: { token: string; pid: string; initial: 'paid' | 'pending' | 'failed'; amount: string; label: string; refNo: string; receiptNo: string; back: string }) {
  const [state, setState] = useState(props.initial);
  const [receipt, setReceipt] = useState(props.receiptNo);
  useEffect(() => {
    if (state !== 'pending') return;
    let n = 0;
    const t = setInterval(async () => {
      n++;
      const r = await fetch(`/api/portal/${props.token}/pay/${props.pid}/status`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
      if (r?.state === 'paid') {
        setReceipt(r.receiptNo || '');
        setState('paid');
      } else if (r?.state === 'failed') setState('failed');
      if (n > 40) clearInterval(t);
    }, 3000);
    return () => clearInterval(t);
  }, [state, props.token, props.pid]);

  return (
    <div className="rounded-[2rem] bg-white p-8 text-center ring-1 ring-ink/5">
      {state === 'paid' ? (
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
      ) : state === 'failed' ? (
        <XCircle className="mx-auto h-14 w-14 text-red-500" />
      ) : (
        <LoaderCircle className="mx-auto h-14 w-14 animate-spin text-gold" />
      )}
      <h1 className="mt-5 font-display text-3xl font-semibold text-ink">
        {state === 'paid' ? 'Payment received, thank you!' : state === 'failed' ? 'The payment did not go through' : 'Confirming your payment…'}
      </h1>
      <p className="mt-3 text-ink/60">
        {props.label} · {props.amount} · {props.refNo}
      </p>
      {state === 'pending' && <p className="mt-3 text-sm text-ink/50">This takes a few seconds. Please keep this page open.</p>}
      {state === 'failed' && <p className="mt-3 text-sm text-ink/60">No money was taken. You can try again from your dashboard, or pay by bank transfer.</p>}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {state === 'paid' && receipt && (
          <a href={`/api/portal/${props.token}/receipt/${props.pid}`} target="_blank" rel="noopener noreferrer" className="btn btn-gold">
            <Download className="h-4 w-4" /> Receipt {receipt}
          </a>
        )}
        <a href={props.back} className="btn btn-dark">Back to my application</a>
      </div>
    </div>
  );
}
