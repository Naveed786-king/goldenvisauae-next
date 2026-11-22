'use client';
// Team tools on one client file: step, quote, payments, decision, advisor and the message log.
import { useEffect, useState } from 'react';
import { Plus, Trash2, Send, Save, Download, CheckCircle2, Copy } from 'lucide-react';
import { Btn, Card, api, toast, Toggle } from './ui';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

const fmt = (n: number) => `AED ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const STATES: [string, string][] = [
  ['auto', 'Automatic'],
  ['done', 'Completed'],
  ['progress', 'In progress'],
  ['pending', 'Pending'],
  ['hold', 'On hold'],
  ['action', 'Action required'],
  ['na', 'Not applicable'],
];

export default function FileAdmin({ app, reload }: { app: any; reload: () => void }) {
  const act = async (body: any, done: string) => {
    try {
      await api(`/api/admin/applications/${app.id}/file`, 'POST', body);
      toast(done);
      reload();
      return true;
    } catch (e: any) {
      toast(e.message, 'error');
      return false;
    }
  };
  return (
    <div className="space-y-6">
      <StepPanel app={app} act={act} />
      <QuotePanel app={app} act={act} />
      <PaymentsPanel app={app} act={act} />
      <DecisionPanel app={app} act={act} />
      <ClientLinkPanel app={app} act={act} />
    </div>
  );
}

export function StepPanel({ app, act }: { app: any; act: (b: any, d: string) => Promise<boolean> }) {
  const cur = app.steps.find((s: any) => s.current);
  const [stageId, setStageId] = useState(cur?.id || app.steps[0]?.id || '');
  const [next, setNext] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const chosen = app.steps.find((s: any) => s.id === stageId);
  return (
    <Card title="Application step" className="p-0">
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <div>
          <label className="admin-label">Move the file to</label>
          <select className="admin-input" value={stageId} onChange={(e) => setStageId(e.target.value)}>
            {Array.from(new Set(app.steps.map((s: any) => s.group))).map((g: any) => (
              <optgroup key={g} label={g}>
                {app.steps
                  .filter((s: any) => s.group === g)
                  .map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.current ? ' (current)' : ''}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <Toggle checked={notify} onChange={setNotify} label="Tell the client (email + WhatsApp)" />
        </div>
        <div className="md:col-span-2">
          <label className="admin-label">Message the client sees for this step</label>
          <textarea className="admin-input min-h-[70px]" value={next} onChange={(e) => setNext(e.target.value)} placeholder={chosen?.next || ''} />
          <p className="mt-1 text-xs text-gray-400">Leave empty to use the standard text shown above in grey.</p>
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Btn
            loading={busy}
            onClick={async () => {
              setBusy(true);
              if (await act({ action: 'stage', stageId, nextStep: next, notify }, notify ? 'Step saved — client notified' : 'Step saved')) setNext('');
              setBusy(false);
            }}
          >
            <Save className="h-4 w-4" /> Save step
          </Btn>
        </div>
      </div>
      <details className="border-t border-gray-100 px-5 py-3">
        <summary className="cursor-pointer text-sm font-bold text-gray-600">Set the state of single steps (on hold, action required…)</summary>
        <ul className="mt-3 space-y-1.5">
          {app.steps.map((s: any) => (
            <li key={s.id} className={cn('flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm', s.current && 'bg-amber-50')}>
              <span className={cn(s.state === 'done' ? 'text-gray-800' : 'text-gray-500')}>
                {s.name} <span className="text-xs text-gray-400">· {s.stateLabel}{s.date ? ` · ${formatDate(s.date)}` : ''}</span>
              </span>
              <select className="admin-input !w-auto !py-1 text-xs" defaultValue="" onChange={(e) => e.target.value && act({ action: 'stepState', stepId: s.id, state: e.target.value }, 'Step state saved')}>
                <option value="">Change…</option>
                {STATES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </details>
    </Card>
  );
}

function QuotePanel({ app, act }: { app: any; act: (b: any, d: string) => Promise<boolean> }) {
  const q = app.quoteData;
  const [lines, setLines] = useState<{ label: string; amount: string }[]>(q.lines.length ? q.lines.map((l: any) => ({ label: l.label, amount: String(l.amount) })) : [{ label: '', amount: '' }]);
  const [serviceFee, setServiceFee] = useState(String(q.serviceFee || ''));
  const [vatPct, setVatPct] = useState(String(q.vatPct ?? 5));
  const [notes, setNotes] = useState(q.notes || '');
  const [validUntil, setValidUntil] = useState(q.validUntil || '');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState('');
  const gov = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const vat = ((Number(serviceFee) || 0) * (Number(vatPct) || 0)) / 100;
  const total = gov + (Number(serviceFee) || 0) + vat;
  const save = async (send: boolean) => {
    setBusy(send ? 'send' : 'save');
    await act({ action: 'quote', lines, serviceFee, vatPct, notes, validUntil, send, notify }, send ? (notify ? 'Quote sent to the client' : 'Quote published in the dashboard') : 'Quote saved (not sent yet)');
    setBusy('');
  };
  return (
    <Card
      title="Quotation"
      actions={
        q.sentAt ? (
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', q.acceptedAt ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
            {q.acceptedAt ? `Accepted ${formatDate(q.acceptedAt)}` : `Sent ${formatDate(q.sentAt)}`}
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500">Not sent</span>
        )
      }
      className="p-0"
    >
      <div className="space-y-3 p-5">
        <p className="text-xs text-gray-500">Government fees and other costs (no VAT), then our service fee (VAT is added on it).</p>
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input className="admin-input flex-1" placeholder="e.g. ICP Golden Visa fee (10 years)" value={l.label} onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} />
            <input className="admin-input !w-32" inputMode="decimal" placeholder="AED" value={l.amount} onChange={(e) => setLines(lines.map((x, k) => (k === i ? { ...x, amount: e.target.value } : x)))} />
            <button type="button" className="px-2 text-gray-300 hover:text-red-600" onClick={() => setLines(lines.filter((_, k) => k !== i))} aria-label="Remove line">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <Btn size="sm" variant="ghost" onClick={() => setLines([...lines, { label: '', amount: '' }])}>
          <Plus className="h-3.5 w-3.5" /> Add line
        </Btn>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="admin-label">Our service fee (AED)</label>
            <input className="admin-input" inputMode="decimal" value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} />
          </div>
          <div>
            <label className="admin-label">VAT % on service fee</label>
            <input className="admin-input" inputMode="decimal" value={vatPct} onChange={(e) => setVatPct(e.target.value)} />
          </div>
          <div>
            <label className="admin-label">Valid until</label>
            <input type="date" className="admin-input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="admin-label">Notes on the quote (optional)</label>
          <textarea className="admin-input min-h-[60px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm">
          <span>
            Gov. &amp; other {fmt(gov)} · Service {fmt(Number(serviceFee) || 0)} · VAT {fmt(vat)}
          </span>
          <b className="text-lg">{fmt(total)}</b>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Toggle checked={notify} onChange={setNotify} label="Send to the client (email + WhatsApp with the PDF)" />
          <div className="flex flex-wrap gap-2">
            {q.sentAt && (
              <a href={app.links.quotePdf} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700">
                <Download className="h-3.5 w-3.5" /> PDF
              </a>
            )}
            <Btn variant="ghost" loading={busy === 'save'} onClick={() => save(false)}>
              <Save className="h-4 w-4" /> Save draft
            </Btn>
            <Btn loading={busy === 'send'} onClick={() => save(true)}>
              <Send className="h-4 w-4" /> {q.sentAt ? 'Send updated quote' : 'Send quote'}
            </Btn>
          </div>
        </div>
        {q.sentAt && q.acceptedAt && <p className="text-xs text-amber-700">Sending an updated quote asks the client to accept it again.</p>}
      </div>
    </Card>
  );
}

function PaymentsPanel({ app, act }: { app: any; act: (b: any, d: string) => Promise<boolean> }) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [link, setLink] = useState('');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const balance = Math.round((app.quoteData.total - app.payments.reduce((s: number, p: any) => s + p.amount, 0)) * 100) / 100;
  useEffect(() => {
    if (!label && app.quoteData.sentAt && balance > 0) {
      setLabel(app.payments.length ? `${app.service} · balance` : `${app.service} · full payment`);
      setAmount(String(balance));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.id]);
  return (
    <Card title={`Payments (${app.payments.length})`} className="p-0">
      <ul className="space-y-2 p-5">
        {app.payments.length === 0 && <li className="text-sm text-gray-400">No payments yet.</li>}
        {app.payments.map((p: any) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-semibold">{p.label}</p>
              <p className="text-xs text-gray-500">
                {p.status === 'paid'
                  ? `Paid ${formatDateTime(p.paidAt)} · ${p.method || ''} · ${p.receiptNo}`
                  : `${p.slipPath ? 'Transfer slip uploaded — check it in Documents · ' : ''}Requested ${formatDate(p.createdAt)}${p.tries ? ` · ${p.tries} card attempt(s)` : ''}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <b>{fmt(p.amount + (p.fee || 0))}</b>
              {p.status === 'paid' ? (
                <a href={app.links.receipt[p.id]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold ring-1 ring-gray-200">
                  <Download className="h-3.5 w-3.5" /> Receipt
                </a>
              ) : (
                <>
                  <button
                    type="button"
                    title="Copy payment link"
                    onClick={() => {
                      navigator.clipboard?.writeText(app.links.pay[p.id]);
                      toast('Payment link copied');
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold ring-1 ring-gray-200"
                  >
                    <Copy className="h-3.5 w-3.5" /> Link
                  </button>
                  <Btn size="sm" onClick={() => confirm(`Mark "${p.label}" as paid? The client gets the receipt.`) && act({ action: 'markPaid', pid: p.id }, 'Marked as paid — receipt sent')}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                  </Btn>
                  <button type="button" className="text-gray-300 hover:text-red-600" onClick={() => confirm('Delete this payment request?') && act({ action: 'deletePayment', pid: p.id }, 'Payment request deleted')} aria-label="Delete payment">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="space-y-3 border-t border-gray-100 p-5">
        <p className="text-sm font-bold">New payment request</p>
        {app.quoteData.sentAt && <p className="text-xs text-gray-500">Quote total {fmt(app.quoteData.total)} · not yet requested {fmt(Math.max(0, balance))}</p>}
        <div className="grid gap-3 md:grid-cols-[1fr_140px]">
          <input className="admin-input" placeholder="What is it for? e.g. Golden Visa · first instalment" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input className="admin-input" inputMode="decimal" placeholder="AED" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <input className="admin-input" placeholder="Own payment link (optional, https://…) — only when no card provider is connected" value={link} onChange={(e) => setLink(e.target.value)} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Toggle checked={notify} onChange={setNotify} label="Send the payment link (email + WhatsApp)" />
          <Btn
            loading={busy}
            onClick={async () => {
              setBusy(true);
              if (await act({ action: 'payment', label, amount, link, notify }, 'Payment request created')) {
                setLabel('');
                setAmount('');
                setLink('');
              }
              setBusy(false);
            }}
          >
            <Plus className="h-4 w-4" /> Request payment
          </Btn>
        </div>
      </div>
    </Card>
  );
}

function DecisionPanel({ app, act }: { app: any; act: (b: any, d: string) => Promise<boolean> }) {
  const d = app.decisionData || {};
  const [result, setResult] = useState(d.result || '');
  const [reason, setReason] = useState(d.reason || '');
  const [refNo, setRefNo] = useState(d.refNo || '');
  const [validTo, setValidTo] = useState(d.validTo || '');
  const [notify, setNotify] = useState(true);
  const [name, setName] = useState(app.advisorName || '');
  const [phone, setPhone] = useState(app.advisorPhone || '');
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Authority decision" className="p-0">
        <div className="space-y-3 p-5">
          <select className="admin-input" value={result} onChange={(e) => setResult(e.target.value)}>
            <option value="">No decision yet</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="on_hold">On hold</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
          {result && (
            <>
              <textarea className="admin-input min-h-[60px]" placeholder="Reason / details for the client" value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className="admin-input" placeholder="Authority ref. no." value={refNo} onChange={(e) => setRefNo(e.target.value)} />
                <input type="date" className="admin-input" title="Visa valid until" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
              </div>
              <Toggle checked={notify} onChange={setNotify} label="Tell the client (email + WhatsApp)" />
            </>
          )}
          <Btn onClick={() => act({ action: 'decision', result, reason, refNo, validTo, notify }, 'Decision saved')}>
            <Save className="h-4 w-4" /> Save decision
          </Btn>
        </div>
      </Card>
      <Card title="Advisor shown to the client" className="p-0">
        <div className="space-y-3 p-5">
          <input className="admin-input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="admin-input" placeholder="WhatsApp / phone (+971…)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Btn variant="dark" onClick={() => act({ action: 'advisor', name, phone }, 'Advisor saved')}>
            <Save className="h-4 w-4" /> Save advisor
          </Btn>
          <p className="text-xs text-gray-400">Empty: the default advisor from Admin → Client system is shown.</p>
        </div>
      </Card>
    </div>
  );
}

/** Client dashboard link of the file and the team member it is assigned to. */
function ClientLinkPanel({ app, act }: { app: any; act: (b: any, d: string) => Promise<boolean> }) {
  const [who, setWho] = useState(app.assignee || '');
  const link: string = app.links?.file || '';
  const wa = `https://wa.me/${String(app.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${app.fullName}, you can follow your file ${app.refNo} here: ${link}`)}`;
  return (
    <Card title="Client dashboard & team" className="p-0">
      <div className="space-y-4 p-5">
        <div>
          <label className="admin-label">Link to this file in the client dashboard</label>
          <div className="flex flex-wrap items-center gap-2">
            <input className="admin-input min-w-0 flex-1" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
            <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700">Open</a>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(link); toast('Link copied'); }} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
            {app.phone && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Send on WhatsApp</a>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">The client opens their file with this private link, no password needed. Share it only with the client.</p>
        </div>
        <div>
          <label className="admin-label">Assigned to</label>
          <div className="flex flex-wrap gap-2">
            <select className="admin-input min-w-0 flex-1" value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="">Nobody</option>
              {(app.team || []).map((m: any) => (
                <option key={m.email} value={m.email.toLowerCase()}>{m.name} ({m.email})</option>
              ))}
            </select>
            <Btn variant="dark" onClick={() => act({ action: 'assign', email: who }, 'Assignment saved')}>
              <Save className="h-4 w-4" /> Save
            </Btn>
          </div>
          <p className="mt-1 text-xs text-gray-400">Without an advisor on the file, the client sees this team member as their contact.</p>
        </div>
      </div>
    </Card>
  );
}

export function NotifyLogCard({ log }: { log: any[] }) {
  if (!log?.length) return null;
  return (
    <Card title="Messages sent (email & WhatsApp)" className="p-0">
      <ul className="max-h-80 space-y-1 overflow-y-auto p-4 text-xs thin-scroll">
        {log.map((l) => (
          <li key={l.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50">
            <span className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', l.ok ? 'bg-emerald-500' : 'bg-red-500')} />
            <div className="min-w-0">
              <p className="font-semibold">
                {l.channel === 'whatsapp' ? 'WhatsApp' : 'Email'} · {l.event} · {formatDateTime(l.createdAt)}
              </p>
              {l.error && <p className="text-red-600">{l.error}</p>}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
