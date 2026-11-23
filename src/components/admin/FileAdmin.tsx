'use client';
// Team tools on one client file, laid out like the Abu Dhabi file page:
// left: Status, Assigned to, Authority decision, Quote, Client order page, Payments, Documents;
// right (exported): Client details, Portal access, message log.
import { Fragment, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Upload, Trash2, Copy, FileText } from 'lucide-react';
import { Btn, Card, api, toast } from './ui';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

type Act = (b: any, d: string) => Promise<boolean>;

const f2 = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmt = (n: number) => `AED ${f2(n)}`;
const STATES: [string, string][] = [
  ['done', 'Completed'],
  ['progress', 'In progress'],
  ['pending', 'Pending'],
  ['hold', 'On hold'],
  ['action', 'Action required'],
  ['na', 'Not applicable'],
];
const STATE_LABEL = Object.fromEntries(STATES) as Record<string, string>;
const DECISIONS: [string, string][] = [
  ['approved', 'Approved'],
  ['rejected', 'Not approved'],
  ['on_hold', 'On hold'],
  ['withdrawn', 'Withdrawn'],
];
const DECISION_TITLE = Object.fromEntries(DECISIONS) as Record<string, string>;

/* ---------- small building blocks in the Abu Dhabi look ---------- */
export function Pill({ tone = 'plain', children }: { tone?: 'plain' | 'gold' | 'ok' | 'due' | 'bad'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold',
        tone === 'plain' && 'bg-[#f6f0e2] text-[#6b5a35]',
        tone === 'gold' && 'bg-[#fbf0cf] text-[#8a6a14]',
        tone === 'ok' && 'bg-emerald-50 text-emerald-700',
        tone === 'due' && 'bg-amber-50 text-amber-700',
        tone === 'bad' && 'bg-red-50 text-red-700',
      )}
    >
      {children}
    </span>
  );
}
const Field = ({ label, full, children, help }: { label: string; full?: boolean; children: React.ReactNode; help?: React.ReactNode }) => (
  <div className={cn(full && 'md:col-span-2 sm:col-span-2')}>
    <label className="admin-label">{label}</label>
    {children}
    {help && <p className="mt-1 text-xs text-gray-400">{help}</p>}
  </div>
);
const Check = ({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) => (
  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#b8862f]" />
    {children}
  </label>
);
const btnSm = 'inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-700 ring-1 ring-[#eadfc4] hover:bg-[#fbf6ea]';

export function useFileAct(app: any, reload: () => void): Act {
  return async (body: any, done: string) => {
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
}

/** Left column of the file page. */
export default function FileAdmin({ app, reload }: { app: any; reload: () => void }) {
  const act = useFileAct(app, reload);
  return (
    <div className="space-y-6">
      <StatusPanel key={`s-${app.stageId || ''}-${app.stageStatus || ''}`} app={app} act={act} />
      <AssignPanel app={app} act={act} />
      <DecisionPanel key={`d-${app.decisionData?.at || ''}`} app={app} act={act} />
      <QuotePanel key={`q-${JSON.stringify(app.quoteData?.lines || [])}`} app={app} act={act} />
      <OrderPagePanel app={app} act={act} />
      <PaymentsPanel key={`p-${app.payments.length}`} app={app} act={act} />
      <DocumentsPanel app={app} act={act} reload={reload} />
    </div>
  );
}

/* ---------- Status ---------- */
function StatusPanel({ app, act }: { app: any; act: Act }) {
  const steps: any[] = app.steps || [];
  const curIdx = Math.max(0, steps.findIndex((s) => s.current));
  const [stageId, setStageId] = useState(steps[curIdx]?.id || '');
  const [text, setText] = useState(app.nextStep || steps[curIdx]?.next || '');
  const [typed, setTyped] = useState(false);
  const [expected, setExpected] = useState(app.expected || '');
  const [saveDefault, setSaveDefault] = useState(false);
  const [notify, setNotify] = useState(true);
  const [over, setOver] = useState<Record<string, string>>(() => Object.fromEntries(steps.filter((s) => s.manual).map((s) => [s.id, s.state])));
  const [busy, setBusy] = useState(false);
  const chosen = steps.find((s) => s.id === stageId);
  const groups = Array.from(new Set(steps.map((s) => s.group)));
  const change = (id: string) => {
    setStageId(id);
    if (!typed) setText(steps.find((s) => s.id === id)?.next || '');
  };
  const save = async () => {
    setBusy(true);
    // single steps first (only the ones changed here), then the step itself
    for (const s of steps) {
      const want = over[s.id] || 'auto';
      const had = s.manual ? s.state : 'auto';
      if (want !== had) await api(`/api/admin/applications/${app.id}/file`, 'POST', { action: 'stepState', stepId: s.id, state: want }).catch(() => null);
    }
    await act({ action: 'stage', stageId, nextStep: text, expected, saveDefault, notify }, notify ? 'Status updated — client told' : 'Status updated');
    setBusy(false);
  };
  return (
    <Card title="Status" actions={<Pill tone="gold">Step {curIdx + 1} of {steps.length}</Pill>} className="p-0">
      <div className="space-y-4 p-5">
        <span className="block h-2 overflow-hidden rounded-full bg-[#f1e9d6]">
          <span className="block h-full rounded-full bg-gradient-to-r from-[#f2d27a] to-[#b8862f]" style={{ width: `${steps.length ? ((curIdx + 1) / steps.length) * 100 : 0}%` }} />
        </span>
        {curIdx === steps.length - 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#fdf8ea] px-4 py-3 text-sm ring-1 ring-[#f0e4c3]">
            <span>⭐ {app.metaData?.reviewAskedAt ? `Google review request sent ${formatDate(app.metaData.reviewAskedAt)}.` : 'File complete: ask the client for a Google review.'}</span>
            <button type="button" className={btnSm} onClick={() => act({ action: 'review' }, 'Review request sent')}>{app.metaData?.reviewAskedAt ? 'Send again' : 'Send review request'}</button>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Current stage">
            <select className="admin-input" value={stageId} onChange={(e) => change(e.target.value)}>
              {groups.map((g) => (
                <optgroup key={g} label={g || 'Other'}>
                  {steps.map((s, i) => (s.group === g ? <option key={s.id} value={s.id}>{i + 1}. {s.name}</option> : null))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Expected next date">
            <input className="admin-input" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="e.g. 14 Nov 2026" />
          </Field>
          <Field
            label="Next step shown to the client"
            full
            help={
              <>
                Filled in from the default text of this stage. Change it for this client if needed.{' '}
                <button type="button" className="font-bold text-[#8a6a14] underline" onClick={() => { setText(chosen?.next || ''); setTyped(false); }}>
                  Use default
                </button>
              </>
            }
          >
            <textarea className="admin-input min-h-[64px]" value={text} onChange={(e) => { setText(e.target.value); setTyped(true); }} />
          </Field>
          <div className="md:col-span-2">
            <Check checked={saveDefault} onChange={setSaveDefault}>Save this text as the default for “{chosen?.name}” (used for all clients from now on)</Check>
          </div>
        </div>
        <details className="rounded-xl bg-[#fbf8f1] px-4 py-3">
          <summary className="cursor-pointer text-sm font-bold text-[#6b5a35]">State of single steps (On hold, Action required, Not applicable…)</summary>
          <div className="mt-3 grid items-center gap-x-4 gap-y-2 sm:grid-cols-[1fr_220px]">
            {steps.map((s, i) => (
              <Fragment key={s.id}>
                <label htmlFor={`ss_${s.id}`} className="text-sm text-gray-700">{i + 1}. {s.name}</label>
                <select id={`ss_${s.id}`} className="admin-input !py-1.5 text-sm" value={over[s.id] || ''} onChange={(e) => setOver({ ...over, [s.id]: e.target.value })}>
                  <option value="">Auto ({STATE_LABEL[s.autoState || s.state] || 'Pending'})</option>
                  {STATES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Fragment>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">Auto: the chosen step and all before it are Completed, the next one is In progress. Change single steps here, e.g. “Change of status: Not applicable”. Internal notes stay in Private notes and are never shown to the client.</p>
        </details>
        <Check checked={notify} onChange={setNotify}>Tell the client (portal message, WhatsApp and email)</Check>
        <div className="flex flex-wrap gap-2">
          <Btn loading={busy} onClick={save}>Update status</Btn>
          <Link href="/admin/steps" className={btnSm}>Edit the step list</Link>
        </div>
      </div>
      <ol className="relative border-t border-[#f3ecdc] px-5 py-4">
        <span className="absolute bottom-6 top-6 w-0.5 bg-[#f1e9d6]" style={{ left: 35 }} aria-hidden />
        {steps.map((s, i) => {
          const st = s.state;
          const head = s.group && (i === 0 || steps[i - 1].group !== s.group);
          return (
            <Fragment key={s.id}>
              {head && <li className="relative bg-white py-2 text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-[#8a6a14]">{s.group}</li>}
              <li className="relative flex items-start gap-3.5 py-2">
                <span
                  className={cn(
                    'relative z-[1] grid h-8 w-8 flex-none place-items-center rounded-full border-2 text-[13px] font-bold',
                    st === 'done' && 'border-[#b8862f] bg-gradient-to-br from-[#f2d27a] to-[#b8862f] text-white',
                    st === 'progress' && 'border-[#b8862f] bg-white text-[#8a6a14] shadow-[0_0_0_6px_rgba(242,210,122,0.35)]',
                    (st === 'hold' || st === 'action') && 'border-amber-400 bg-amber-50 text-amber-700',
                    (st === 'pending' || st === 'na') && 'border-[#ecdcb2] bg-white text-gray-400',
                  )}
                >
                  {st === 'done' ? '✓' : st === 'na' ? '–' : st === 'hold' || st === 'action' ? '!' : i + 1}
                </span>
                <div className="min-w-0 pt-1">
                  <b className={cn('block text-[15px]', st === 'done' || st === 'progress' ? 'text-gray-900' : 'font-semibold text-gray-400')}>{s.name}</b>
                  {st !== 'done' && st !== 'pending' && <span className="mt-1 inline-block"><Pill tone={st === 'progress' ? 'gold' : 'due'}>{STATE_LABEL[st]}</Pill></span>}
                  {s.date && st !== 'pending' && st !== 'na' && <small className="block text-gray-400">{formatDate(s.date)}</small>}
                </div>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </Card>
  );
}

/* ---------- Assigned to ---------- */
function AssignPanel({ app, act }: { app: any; act: Act }) {
  const [who, setWho] = useState(app.assignee || '');
  const cur = (app.team || []).find((m: any) => m.email.toLowerCase() === (app.assignee || '').toLowerCase());
  return (
    <Card title="Assigned to" actions={<Pill>{app.assignee ? cur?.name || app.assignee : 'Not assigned'}</Pill>} className="p-0">
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          <select className="admin-input min-w-[240px] max-w-sm flex-1" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Team member">
            <option value="">Not assigned (owners and admins only)</option>
            {(app.team || []).map((m: any) => (
              <option key={m.email} value={m.email.toLowerCase()}>{m.name} · {m.email}</option>
            ))}
          </select>
          <Btn size="sm" onClick={() => act({ action: 'assign', email: who }, 'Assignment saved')}>Save</Btn>
        </div>
        <p className="mt-2 text-xs text-gray-400">The assigned team member is the client’s contact when no advisor is set on the order page.</p>
      </div>
    </Card>
  );
}

/* ---------- Authority decision ---------- */
function DecisionPanel({ app, act }: { app: any; act: Act }) {
  const d = app.decisionData || {};
  const [result, setResult] = useState(d.result || '');
  const [refNo, setRefNo] = useState(d.refNo || '');
  const [validTo, setValidTo] = useState(d.validTo || '');
  const [reason, setReason] = useState(d.reason || '');
  const [nextAction, setNextAction] = useState(d.nextAction || '');
  const [advance, setAdvance] = useState(true);
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState('');
  const tone = d.result === 'approved' ? 'ok' : d.result === 'rejected' ? 'bad' : 'due';
  return (
    <Card title="Authority decision" actions={d.result ? <Pill tone={tone}>{DECISION_TITLE[d.result]} · {formatDate(d.at)}</Pill> : <Pill>Awaiting decision</Pill>} className="p-0">
      <div className="space-y-4 p-5">
        {d.result && (
          <div className="rounded-xl bg-[#fbf6ea] px-4 py-3 text-sm leading-relaxed text-gray-700">
            <b>{DECISION_TITLE[d.result]}</b> on {formatDateTime(d.at)}{d.by ? ` by ${d.by}` : ''}
            {d.refNo && <><br />Authority reference: {d.refNo}</>}
            {d.validTo && <><br />Visa valid until: {formatDate(d.validTo)}</>}
            {d.reason && <><br />Reason / note: {d.reason}</>}
            {d.nextAction && <><br />Next step for client: {d.nextAction}</>}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Decision" full>
            <div className="flex flex-wrap gap-6" role="radiogroup">
              {DECISIONS.map(([k, v]) => (
                <label key={k} className="flex cursor-pointer flex-col items-center gap-1.5 text-sm font-semibold text-gray-700">
                  <input type="radio" name={`dec-${app.id}`} value={k} checked={result === k} onChange={() => setResult(k)} className="peer sr-only" />
                  <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#d9cba6] bg-white text-white peer-checked:border-[#b8862f] peer-checked:bg-gradient-to-br peer-checked:from-[#f2d27a] peer-checked:to-[#b8862f] peer-focus-visible:ring-2 peer-focus-visible:ring-[#f2d27a]">
                    {result === k ? '✓' : ''}
                  </span>
                  {v}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Authority reference (optional)">
            <input className="admin-input" value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="e.g. ICP or GDRFA application number" />
          </Field>
          <Field label="Visa valid until (if approved)">
            <input type="date" className="admin-input" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
          </Field>
          <Field label="Reason or note from the authority (required if rejected)" full>
            <textarea className="admin-input min-h-[72px]" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Salary certificate not accepted; degree attestation missing" />
          </Field>
          <Field label="What the client should do next" full>
            <textarea className="admin-input min-h-[56px]" value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="e.g. We can appeal or re-apply once the attested degree is ready" />
          </Field>
        </div>
        <Check checked={advance} onChange={setAdvance}>If approved, move the file to “Entry permit / pre-approval”</Check>
        <Check checked={notify} onChange={setNotify}>Tell the client (portal message, WhatsApp and email)</Check>
        <div className="flex flex-wrap gap-2">
          <Btn loading={busy === 'save'} onClick={async () => { setBusy('save'); await act({ action: 'decision', result, refNo, validTo, reason, nextAction, advance, notify }, 'Decision saved'); setBusy(''); }}>Save decision</Btn>
          {d.result && (
            <Btn variant="outline" loading={busy === 'clear'} onClick={async () => { setBusy('clear'); await act({ action: 'decision', clear: true }, 'Decision cleared — file reopened'); setBusy(''); }}>
              Clear decision (reopen)
            </Btn>
          )}
        </div>
        {!!d.history?.length && (
          <details className="text-sm">
            <summary className="cursor-pointer font-bold text-[#6b5a35]">Earlier decisions ({d.history.length})</summary>
            <ul className="mt-2 space-y-1 text-gray-600">
              {d.history.map((h: any, i: number) => <li key={i}>{DECISION_TITLE[h.result]} · {formatDateTime(h.at)}{h.reason ? ` · ${h.reason}` : ''}</li>)}
            </ul>
          </details>
        )}
      </div>
    </Card>
  );
}

/* ---------- Quote ---------- */
type Row = { label: string; qty: string; unit: string };
const numOf = (v: string) => Number(String(v).replace(/[^\d.-]/g, '')) || 0;
function QuotePanel({ app, act }: { app: any; act: Act }) {
  const q = app.quoteData;
  const m = app.metaData || {};
  const filled: Row[] = q.lines.map((l: any) => {
    const qty = l.qty || 1;
    return { label: l.label, qty: String(qty), unit: Number(l.unit ?? l.amount / qty).toFixed(2) };
  });
  const blanks = Math.max(3, 8 - filled.length);
  const [rows, setRows] = useState<Row[]>([...filled, ...Array.from({ length: blanks }, () => ({ label: '', qty: '', unit: '' }))]);
  const [serviceFee, setServiceFee] = useState(q.serviceFee ? Number(q.serviceFee).toFixed(2) : '');
  const [insurance, setInsurance] = useState(q.insurance || '');
  const [vip, setVip] = useState(false);
  const [newFile, setNewFile] = useState(true);
  const [busy, setBusy] = useState('');
  const vatPct = Number(q.vatPct ?? 5);
  const qtyOf = (r: Row) => Math.max(1, Math.round(Number(r.qty) || 1));
  const amt = (r: Row) => Math.round(qtyOf(r) * numOf(r.unit) * 100) / 100;
  const gov = rows.filter((r) => r.label.trim()).reduce((s, r) => s + amt(r), 0);
  const fee = numOf(serviceFee);
  const vat = Math.round(((fee * vatPct) / 100) * 100) / 100;
  const people = 1 + (m.adults || 0) + (m.kids || 0);
  const set = (i: number, k: keyof Row, v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const save = async (send: boolean) => {
    setBusy(send ? 'send' : 'save');
    const lines = rows.filter((r) => r.label.trim() && amt(r)).map((r) => ({ label: r.label.trim(), qty: qtyOf(r), unit: numOf(r.unit) }));
    await act({ action: 'quote', lines, serviceFee: fee, vatPct, insurance, send, notify: true }, send ? 'Quote saved and sent to the client' : 'Quote saved');
    setBusy('');
  };
  return (
    <Card
      title="Quote"
      actions={<Pill tone={q.acceptedAt ? 'ok' : q.sentAt ? 'due' : 'plain'}>{q.acceptedAt ? `Accepted ${formatDate(q.acceptedAt)}` : q.sentAt ? `Sent ${formatDate(q.sentAt)}` : 'Draft'}</Pill>}
      className="p-0"
    >
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-[#f0e4c3] bg-[#fdf8ea] px-4 py-3">
          <span className="min-w-[200px] flex-1 text-sm text-gray-700">
            Fill government fees from the calculator for {people} {people > 1 ? 'people' : 'person'}, {m.location === 'out' ? 'outside' : 'inside'} the UAE.
          </span>
          <Check checked={vip} onChange={setVip}>VIP medical</Check>
          <Check checked={newFile} onChange={setNewFile}>Open sponsor file</Check>
          <button type="button" className={btnSm} disabled={busy === 'fill'} onClick={async () => { setBusy('fill'); await act({ action: 'fillQuote', vip, newFile }, 'Government fee lines filled in'); setBusy(''); }}>
            Fill lines
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl ring-1 ring-[#f0e7d2]">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-[#faf6ec] text-left text-[0.7rem] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="w-[76px] px-2 py-3">Qty</th>
                <th className="w-[150px] px-2 py-3">Unit price (AED)</th>
                <th className="w-[110px] px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3ecdc]">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-2"><input className="admin-input" value={r.label} onChange={(e) => set(i, 'label', e.target.value)} placeholder="Add an item" list="svc-items" /></td>
                  <td className="px-2 py-2"><input className="admin-input text-center" value={r.qty} onChange={(e) => set(i, 'qty', e.target.value)} inputMode="numeric" placeholder="1" /></td>
                  <td className="px-2 py-2"><input className="admin-input" value={r.unit} onChange={(e) => set(i, 'unit', e.target.value)} inputMode="decimal" placeholder="0.00" /></td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">{r.label.trim() && amt(r) ? f2(amt(r)) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <datalist id="svc-items">
          {(app.services || []).map((x: any) => <option key={x.label} value={x.label} label={x.price ? `${x.label} · ${x.price}` : x.label} />)}
        </datalist>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-400">Pick a service or type your own item. Amount = Qty × Unit price. Prices are set in Services and Cost calculator.</p>
          <button type="button" className="text-xs font-bold text-[#8a6a14]" onClick={() => setRows([...rows, { label: '', qty: '', unit: '' }, { label: '', qty: '', unit: '' }])}>+ More rows</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Our service fee (AED, before VAT)">
            <input className="admin-input" inputMode="decimal" value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} />
          </Field>
          <Field label="Health insurance">
            <input className="admin-input" value={insurance} onChange={(e) => setInsurance(e.target.value)} placeholder="Quoted separately" />
          </Field>
        </div>
        <div className="space-y-2 rounded-2xl bg-[#faf6ec] px-4 py-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Government fees</span><b>{fmt(gov)}</b></div>
          <div className="flex justify-between"><span className="text-gray-500">Service fee + {vatPct}% VAT</span><b>{fmt(fee + vat)}</b></div>
          <div className="flex justify-between border-t border-[#efe3c4] pt-2 text-base"><span className="font-bold">Quote total</span><b className="text-[#8a6a14]">{fmt(gov + fee + vat)}</b></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="outline" loading={busy === 'save'} onClick={() => save(false)}>Save draft</Btn>
          <Btn loading={busy === 'send'} onClick={() => save(true)}>Save and send to client</Btn>
          {q.sentAt && app.links?.quotePdf && (
            <a href={app.links.quotePdf} target="_blank" rel="noopener noreferrer" className={btnSm}><Download className="h-3.5 w-3.5" /> Quote PDF</a>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ---------- Client order page ---------- */
function OrderPagePanel({ app, act }: { app: any; act: Act }) {
  const [name, setName] = useState(app.advisorName || '');
  const [phone, setPhone] = useState(app.advisorPhone || '');
  const [validUntil, setValidUntil] = useState(app.quoteData?.validUntil || '');
  return (
    <Card title="Client order page" actions={<a href={app.links?.file} target="_blank" rel="noopener noreferrer" className={btnSm}>View as client ↗</a>} className="p-0">
      <div className="grid items-end gap-4 p-5 md:grid-cols-2">
        <Field label="Your contact (advisor shown to the client)">
          <input className="admin-input" list="team-names" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sara Ahmed" />
          <datalist id="team-names">{(app.team || []).map((m: any) => <option key={m.email} value={m.name} />)}</datalist>
        </Field>
        <Field label="Advisor phone / WhatsApp">
          <input className="admin-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971…" />
        </Field>
        <Field label="Quote valid until">
          <input type="date" className="admin-input" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </Field>
        <div>
          <Btn onClick={() => act({ action: 'orderPage', name, phone, validUntil }, 'Order page saved')}>Save</Btn>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Payments ---------- */
function payState(app: any) {
  const quote = app.quoteData?.sentAt ? app.quoteData.total : 0;
  const paid = app.payments.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + p.amount, 0);
  const requested = app.payments.filter((p: any) => p.status !== 'paid').reduce((s: number, p: any) => s + p.amount, 0);
  const total = Math.max(quote, paid + requested);
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);
  const state = total <= 0 ? 'none' : paid <= 0 ? 'unpaid' : remaining > 0.009 ? 'partial' : 'paid';
  return { total, paid, remaining, state };
}

function PaymentsPanel({ app, act }: { app: any; act: Act }) {
  const ps = payState(app);
  const quoteTotal = app.quoteData?.total || 0;
  const [open, setOpen] = useState(app.payments.length === 0);
  const [label, setLabel] = useState(app.payments.length ? '' : 'Government fees and service fee');
  const [amount, setAmount] = useState(app.payments.length || !quoteTotal ? '' : Number(quoteTotal).toFixed(2));
  const [link, setLink] = useState('');
  const [method, setMethod] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  return (
    <Card title="Payments" actions={<Link href="/admin/payments" className={btnSm}>Online payment settings</Link>} className="p-0">
      <div className="space-y-4 p-5">
        {ps.state !== 'none' && (
          <div className={cn('flex flex-wrap items-center gap-x-10 gap-y-3 rounded-2xl px-4 py-3 ring-1', ps.state === 'paid' ? 'bg-emerald-50/70 ring-emerald-200' : ps.state === 'partial' ? 'bg-[#fdf8ea] ring-[#f0e4c3]' : 'bg-amber-50/60 ring-amber-200')}>
            {([['Total', ps.total], ['Paid', ps.paid], ['Remaining', ps.remaining]] as [string, number][]).map(([k, v]) => (
              <div key={k}>
                <small className="block text-[0.68rem] font-bold uppercase tracking-wider text-gray-500">{k}</small>
                <b className="text-base">{fmt(v)}</b>
              </div>
            ))}
            <span className="ml-auto"><Pill tone={ps.state === 'paid' ? 'ok' : ps.state === 'partial' ? 'gold' : 'due'}>{ps.state === 'paid' ? 'Paid in full' : ps.state === 'partial' ? 'Part paid' : 'Not paid yet'}</Pill></span>
          </div>
        )}
        {app.payments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#eadfc4] py-6 text-center text-sm text-gray-400">No payment requests yet.</p>
        ) : (
          <div className="space-y-2">
            {app.payments.map((p: any) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-[#f0e7d2]">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-gradient-to-br from-[#fdf3d6] to-[#f2d27a] text-[0.65rem] font-extrabold text-[#8a6a14]">AED</span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm">{p.label}</b>
                  <small className="text-xs text-gray-500">
                    {fmt(p.amount)}
                    {p.fee ? ` + card fee ${fmt(p.fee)} (${p.card === 'intl' ? 'intl.' : 'UAE'} card)` : ''} ·{' '}
                    {p.status === 'paid' ? `Paid ${formatDate(p.paidAt)} · ${p.method || ''} · ${p.receiptNo || ''}` : `${p.slipPath ? 'Transfer slip uploaded · ' : ''}Requested ${formatDate(p.createdAt)}${p.link ? ' · payment link set' : ''}`}
                  </small>
                </span>
                <Pill tone={p.status === 'paid' ? 'ok' : 'due'}>{p.status === 'paid' ? 'paid' : 'due'}</Pill>
                {p.status === 'paid' ? (
                  <a href={app.links?.receipt?.[p.id]} target="_blank" rel="noopener noreferrer" className={btnSm}>Receipt PDF</a>
                ) : (
                  <>
                    <button type="button" className={btnSm} onClick={() => { navigator.clipboard?.writeText(app.links?.pay?.[p.id] || ''); toast('Payment link copied'); }}>
                      <Copy className="h-3.5 w-3.5" /> Copy pay link
                    </button>
                    <select className="admin-input !w-[130px] !py-1.5 text-xs" value={method[p.id] || 'Card'} onChange={(e) => setMethod({ ...method, [p.id]: e.target.value })}>
                      <option>Card</option>
                      <option>Bank transfer</option>
                      <option>Cash</option>
                    </select>
                    <Btn size="sm" onClick={() => confirm(`Mark "${p.label}" as paid? The client gets the receipt.`) && act({ action: 'markPaid', pid: p.id, method: method[p.id] || 'Card' }, 'Marked as paid — receipt sent')}>Mark paid</Btn>
                    <button type="button" className="px-1 text-gray-300 hover:text-red-600" onClick={() => confirm('Remove this payment request?') && act({ action: 'deletePayment', pid: p.id }, 'Payment request removed')} aria-label="Remove request">✕</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <div>
          <button type="button" className="text-sm font-bold text-[#8a6a14]" onClick={() => setOpen(!open)}>+ Request a payment</button>
          {open && (
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Field label="Description"><input className="admin-input" value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
              <Field label="Amount (AED)"><input className="admin-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
              <Field label="Secure payment link (from your card provider, optional)" full>
                <input className="admin-input" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
              </Field>
              <div className="md:col-span-2">
                <Btn
                  loading={busy}
                  onClick={async () => {
                    setBusy(true);
                    await act({ action: 'payment', label, amount, link, notify: true }, 'Payment request added');
                    setBusy(false);
                  }}
                >
                  Add payment request
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ---------- Documents ---------- */
const sizeLabel = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
function DocumentsPanel({ app, act, reload }: { app: any; act: Act; reload: () => void }) {
  const m = app.metaData || {};
  const fileRef = useRef<HTMLInputElement>(null);
  const [docName, setDocName] = useState('');
  const [share, setShare] = useState(true);
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState(((m.requests?.length ? m.requests : m.defaultRequests) || []).join('\n'));
  const [tell, setTell] = useState(false);
  const upload = async () => {
    const files = fileRef.current?.files;
    if (!files?.length) return toast('Choose a file first', 'error');
    setBusy(true);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    if (docName.trim()) fd.append('label', docName.trim());
    if (!share) fd.append('private', '1');
    try {
      await api(`/api/admin/applications/${app.id}/documents`, 'POST', fd);
      toast(share ? 'Uploaded and shared with the client' : 'Uploaded (team only)');
      setDocName('');
      if (fileRef.current) fileRef.current.value = '';
      reload();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const del = async (doc: string) => {
    if (!confirm('Delete this document for ever?')) return;
    try {
      await api(`/api/admin/applications/${app.id}/documents?doc=${doc}`, 'DELETE');
      toast('Document deleted');
      reload();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };
  return (
    <Card title="Documents" actions={<span className="text-xs text-gray-400">{app.documents.length} files</span>} className="p-0">
      <div className="space-y-5 p-5">
        {app.documents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#eadfc4] py-8 text-center text-sm text-gray-400">No documents yet.</p>
        ) : (
          <div className="space-y-2">
            {app.documents.map((d: any) => (
              <div key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-[#f0e7d2]">
                <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-[#faf6ec] text-[0.62rem] font-extrabold text-[#8a6a14]">{(String(d.name).split('.').pop() || 'FILE').toUpperCase().slice(0, 4)}</span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{d.name}</b>
                  <small className="text-xs text-gray-500">{d.uploadedBy === 'admin' ? 'From team' : 'From client'} · {sizeLabel(d.size || 0)} · {formatDateTime(d.createdAt)}</small>
                </span>
                {d.uploadedBy === 'admin' && (
                  <button type="button" className={btnSm} onClick={() => act({ action: 'share', doc: d.id }, d.shared ? 'No longer shared' : 'Shared with the client')}>
                    {d.shared ? 'Shared ✓' : 'Share with client'}
                  </button>
                )}
                <a href={`/api/files/${d.id}`} target="_blank" rel="noopener noreferrer" className={btnSm}>Download</a>
                <button type="button" className="px-1 text-gray-300 hover:text-red-600" onClick={() => del(d.id)} aria-label="Delete document"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <span className="admin-label">Upload a document</span>
            <input className="admin-input" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Name, e.g. Valuation certificate" />
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#e3d4ad] bg-[#fdfaf2] px-3 py-3 text-sm text-gray-600">
              <Upload className="h-4 w-4 flex-none text-[#b8862f]" />
              <input ref={fileRef} type="file" multiple className="min-w-0 flex-1 text-xs" />
            </label>
            <Check checked={share} onChange={setShare}>Share with the client</Check>
            <Btn variant="outline" loading={busy} onClick={upload}><FileText className="h-4 w-4" /> Upload</Btn>
          </div>
          <div className="space-y-3">
            <span className="admin-label">Documents the client must upload (one per line)</span>
            <textarea className="admin-input min-h-[120px]" value={requests} onChange={(e) => setRequests(e.target.value)} />
            <Check checked={tell} onChange={setTell}>Message the client with this list</Check>
            <Btn variant="outline" onClick={() => act({ action: 'requests', requests, notify: tell }, tell ? 'List saved and sent to the client' : 'List saved')}>Save list</Btn>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------- Right column ---------- */
export function ClientDetails({ app, reload }: { app: any; reload: () => void }) {
  const act = useFileAct(app, reload);
  const m = app.metaData || {};
  const [f, setF] = useState({
    name: app.fullName || '',
    phone: app.phone || '',
    contact: m.contact || '',
    email: app.email || '',
    nationality: app.nationality || '',
    service: app.service || '',
    location: m.location || 'in',
    adults: String(m.adults ?? 0),
    kids: String(m.kids ?? 0),
    language: app.language || 'en',
    privateNotes: m.privateNotes || '',
  });
  const [busy, setBusy] = useState(false);
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const services: string[] = Array.from(new Set<string>([app.service, ...(app.services || []).map((x: any) => x.label)].filter(Boolean)));
  const extra = ([['Passport no.', app.passportNo], ['Date of birth', app.dateOfBirth], ['Property value', app.propertyValue], ['Notes from the application', app.notes]] as [string, string][]).filter(([, v]) => v);
  return (
    <Card title="Client details" className="p-0">
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Name"><input className="admin-input" value={f.name} onChange={up('name')} /></Field>
        <Field label="WhatsApp"><input className="admin-input" value={f.phone} onChange={up('phone')} /></Field>
        <Field label="Contact number"><input className="admin-input" value={f.contact} onChange={up('contact')} placeholder="Optional, if different from WhatsApp" /></Field>
        <Field label="Email"><input className="admin-input" value={f.email} onChange={up('email')} /></Field>
        <Field label="Nationality"><input className="admin-input" value={f.nationality} onChange={up('nationality')} /></Field>
        <Field label="Route">
          <select className="admin-input" value={f.service} onChange={up('service')}>
            {services.map((x) => <option key={x}>{x}</option>)}
          </select>
        </Field>
        <Field label="Location">
          <select className="admin-input" value={f.location} onChange={up('location')}>
            <option value="in">Inside the UAE</option>
            <option value="out">Outside the UAE</option>
          </select>
        </Field>
        <Field label="Adults"><input className="admin-input" type="number" min={0} max={10} value={f.adults} onChange={up('adults')} /></Field>
        <Field label="Children"><input className="admin-input" type="number" min={0} max={10} value={f.kids} onChange={up('kids')} /></Field>
        <Field label="Language"><input className="admin-input" value={f.language} onChange={up('language')} /></Field>
        <Field label="Private notes (never shown to the client)" full>
          <textarea className="admin-input min-h-[80px]" value={f.privateNotes} onChange={up('privateNotes')} />
        </Field>
        {extra.length > 0 && (
          <dl className="space-y-1.5 rounded-xl bg-[#faf6ec] px-4 py-3 text-xs sm:col-span-2">
            {extra.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4"><dt className="text-gray-500">{k}</dt><dd className="whitespace-pre-line text-right font-semibold">{v}</dd></div>
            ))}
          </dl>
        )}
        <div className="sm:col-span-2">
          <Btn variant="outline" loading={busy} onClick={async () => { setBusy(true); await act({ action: 'client', ...f }, 'Client details saved'); setBusy(false); }}>Save details</Btn>
        </div>
      </div>
    </Card>
  );
}

export function PortalAccess({ app, reload, isAdmin }: { app: any; reload: () => void; isAdmin?: boolean }) {
  const act = useFileAct(app, reload);
  const link: string = app.links?.file || '';
  const del = async () => {
    if (!confirm('Delete for ever? This cannot be undone.')) return;
    try {
      await api(`/api/admin/applications/${app.id}`, 'DELETE');
      toast('Application deleted');
      window.location.href = '/admin/applications';
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };
  return (
    <Card title="Portal access" className="p-0">
      <div className="space-y-3 p-5">
        <p className="text-sm text-gray-500">Anyone with the link can open this file. Make a new link if it was shared by mistake.</p>
        <code className="block break-all rounded-xl bg-[#fbf4df] p-2.5 text-[12.5px]">{link}</code>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSm} onClick={() => { navigator.clipboard?.writeText(link); toast('Link copied'); }}><Copy className="h-3.5 w-3.5" /> Copy</button>
          <button type="button" className={btnSm} onClick={() => confirm('Make a new link? The old link stops working.') && act({ action: 'newLink' }, 'New link made')}>Make a new link</button>
          <button type="button" className={btnSm} onClick={() => act({ action: 'archive' }, app.metaData?.archived ? 'Application restored' : 'Application archived')}>
            {app.metaData?.archived ? 'Restore application' : 'Archive application'}
          </button>
          {isAdmin && <button type="button" className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100" onClick={del}>Delete application</button>}
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
