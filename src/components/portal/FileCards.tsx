'use client';
import { useState } from 'react';
import { Check, Circle, Download, CreditCard, LoaderCircle, AlertTriangle, PauseCircle, Clock, Phone, MessageCircle, CheckCircle2, XCircle } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

const fmt = (n: number, cur = 'AED') => `${cur} ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATE_STYLE: Record<string, { dot: string; chip: string; icon: any }> = {
  done: { dot: 'bg-gold text-ink', chip: 'bg-gold/15 text-gold-deep', icon: Check },
  progress: { dot: 'bg-ink text-white', chip: 'bg-ink text-white', icon: Clock },
  pending: { dot: 'bg-ink/5 text-ink/30', chip: 'bg-ink/5 text-ink/45', icon: Circle },
  hold: { dot: 'bg-amber-100 text-amber-700', chip: 'bg-amber-100 text-amber-800', icon: PauseCircle },
  action: { dot: 'bg-red-100 text-red-600', chip: 'bg-red-100 text-red-700', icon: AlertTriangle },
  na: { dot: 'bg-ink/5 text-ink/25', chip: 'bg-ink/5 text-ink/40', icon: Circle },
};

export function StepsCard({ steps }: { steps: any[] }) {
  const groups = Array.from(new Set(steps.map((s) => s.group)));
  const [open, setOpen] = useState<string | null>(null);
  if (!steps.length) return null;
  return (
    <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink/5 md:p-8">
      <h3 className="font-bold text-ink">Application steps</h3>
      <div className="mt-5 space-y-5">
        {groups.map((g) => {
          const list = steps.filter((s) => s.group === g);
          const done = list.filter((s) => s.state === 'done').length;
          const active = list.some((s) => s.current || s.state === 'progress' || s.state === 'action');
          const isOpen = open === g || (open === null && active);
          return (
            <div key={g} className="rounded-2xl ring-1 ring-ink/5">
              <button type="button" onClick={() => setOpen(isOpen ? '' : g)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="text-sm font-bold text-ink">{g}</span>
                <span className="text-xs font-bold text-ink/45">
                  {done}/{list.length}
                </span>
              </button>
              {isOpen && (
                <ol className="space-y-1 px-4 pb-4">
                  {list.map((s) => {
                    const st = STATE_STYLE[s.state] || STATE_STYLE.pending;
                    const Icon = st.icon;
                    return (
                      <li key={s.id} className={cn('flex items-start gap-3 rounded-xl px-2 py-2', s.current && 'bg-sand')}>
                        <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full', st.dot)}>
                          <Icon className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={cn('text-sm font-semibold', s.state === 'pending' ? 'text-ink/45' : 'text-ink')}>{s.name}</p>
                            {s.state !== 'pending' && s.state !== 'done' && <span className={cn('rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase', st.chip)}>{s.stateLabel}</span>}
                          </div>
                          {s.date && s.state === 'done' && <p className="text-xs text-ink/40">{formatDate(s.date)}</p>}
                          {s.current && <p className="mt-1 text-xs text-ink/65">{s.next}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function QuoteCard({ id, q, currency, onChange }: { id: string; q: any; currency: string; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function accept() {
    setBusy(true);
    setErr('');
    const r = await fetch(`/api/account/applications/${id}/accept`, { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(d.error || 'Could not accept the quotation');
    onChange();
  }
  return (
    <div id="quote" className="rounded-[2rem] bg-white p-6 ring-1 ring-ink/5 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-bold text-ink">Your quotation</h3>
        {q.acceptedAt ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Accepted {formatDate(q.acceptedAt)}</span>
        ) : q.validUntil ? (
          <span className="rounded-full bg-sand px-3 py-1 text-xs font-bold text-ink/60">Valid until {formatDate(q.validUntil)}</span>
        ) : null}
      </div>
      <table className="mt-4 w-full text-sm">
        <tbody className="divide-y divide-ink/5">
          {q.lines.map((l: any, i: number) => (
            <tr key={i}>
              <td className="py-2.5 pr-4 text-ink/75">{l.label}</td>
              <td className="py-2.5 text-right font-semibold text-ink">{fmt(l.amount, currency)}</td>
            </tr>
          ))}
          {q.serviceFee > 0 && (
            <tr>
              <td className="py-2.5 pr-4 text-ink/75">Our service fee</td>
              <td className="py-2.5 text-right font-semibold text-ink">{fmt(q.serviceFee, currency)}</td>
            </tr>
          )}
          {q.vat > 0 && (
            <tr>
              <td className="py-2.5 pr-4 text-ink/75">VAT {q.vatPct}% on the service fee</td>
              <td className="py-2.5 text-right font-semibold text-ink">{fmt(q.vat, currency)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td className="pt-4 font-bold text-ink">Total</td>
            <td className="pt-4 text-right font-display text-2xl font-bold text-ink">{fmt(q.total, currency)}</td>
          </tr>
        </tfoot>
      </table>
      {q.notes && <p className="mt-3 whitespace-pre-line text-xs text-ink/55">{q.notes}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        {q.payOrder && (
          <a href={q.payOrder} className="btn btn-gold">
            <CreditCard className="h-4 w-4" /> Pay &amp; confirm
          </a>
        )}
        {!q.acceptedAt && (
          <button type="button" onClick={accept} disabled={busy} className={q.payOrder ? 'btn btn-dark' : 'btn btn-gold'}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Accept quotation
          </button>
        )}
        <a href={q.pdf} target="_blank" rel="noopener noreferrer" className="btn btn-dark btn-sm self-center">
          <Download className="h-4 w-4" /> PDF
        </a>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </div>
  );
}

export function PaymentsCard({ payments, currency }: { payments: any[]; currency: string }) {
  return (
    <div id="payments" className="rounded-[2rem] bg-white p-6 ring-1 ring-ink/5 md:p-8">
      <h3 className="font-bold text-ink">Payments</h3>
      <ul className="mt-4 space-y-3">
        {payments.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sand/60 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">{p.label}</p>
              <p className="text-xs text-ink/50">
                {p.status === 'paid' ? `Paid ${p.paidAt ? formatDate(p.paidAt) : ''} · ${p.receiptNo}` : p.slip ? 'Transfer slip received, being checked' : `Requested ${formatDate(p.createdAt)}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-ink">{fmt(p.status === 'paid' ? p.total : p.amount, currency)}</span>
              {p.status === 'paid' ? (
                <a href={p.receipt} target="_blank" rel="noopener noreferrer" className="btn btn-dark btn-sm">
                  <Download className="h-4 w-4" /> Receipt
                </a>
              ) : (
                <a href={p.pay} className="btn btn-gold btn-sm">
                  <CreditCard className="h-4 w-4" /> Pay
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DecisionBanner({ d }: { d: any }) {
  const good = d.result === 'approved';
  const bad = d.result === 'rejected';
  return (
    <div className={cn('flex items-start gap-4 rounded-[2rem] p-6 ring-1', good ? 'bg-emerald-50 ring-emerald-200' : bad ? 'bg-red-50 ring-red-200' : 'bg-amber-50 ring-amber-200')}>
      {good ? <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" /> : bad ? <XCircle className="h-8 w-8 shrink-0 text-red-600" /> : <PauseCircle className="h-8 w-8 shrink-0 text-amber-600" />}
      <div>
        <p className="font-display text-2xl font-semibold text-ink">Authority decision: {d.label}</p>
        {d.reason && <p className="mt-1 whitespace-pre-line text-sm text-ink/75">{d.reason}</p>}
        <p className="mt-1 text-xs text-ink/50">
          {d.at ? formatDate(d.at) : ''}
          {d.refNo ? ` · Ref. ${d.refNo}` : ''}
          {d.validTo ? ` · Valid until ${formatDate(d.validTo)}` : ''}
        </p>
      </div>
    </div>
  );
}

export function AdvisorCard({ a, refNo }: { a: { name: string; phone: string }; refNo: string }) {
  const wa = String(a.phone || '').replace(/\D/g, '');
  return (
    <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink/5">
      <p className="text-xs font-extrabold uppercase tracking-wider text-gold-deep">Your advisor</p>
      <p className="mt-1 font-display text-2xl font-semibold text-ink">{a.name}</p>
      {wa && (
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hello, about my application ${refNo}`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-gold btn-sm">
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <a href={`tel:+${wa}`} className="btn btn-dark btn-sm">
            <Phone className="h-4 w-4" /> Call
          </a>
        </div>
      )}
    </div>
  );
}
