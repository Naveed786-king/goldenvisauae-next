'use client';
// Admin → Client system: dashboard address & advisor, payments, WhatsApp, client messages, PDFs, steps.
import { useEffect, useRef, useState } from 'react';
import { Save, Send, Plus } from 'lucide-react';
import { GOLDEN_STEPS, OTHER_STEPS } from '@/lib/portal/config';
import { Btn, Card, PageTitle, Spinner, api, toast, Toggle } from './ui';
import { useSetting } from './SettingsEditors';
import { cn } from '@/lib/utils';

const TABS = [
  ['portal', 'Dashboard'],
  ['payments', 'Payments'],
  ['whatsapp', 'WhatsApp'],
  ['clientMail', 'Messages'],
  ['pdf', 'PDFs'],
  ['steps', 'Steps'],
] as const;

const EVENTS: { key: string; label: string; team?: boolean; vars: string }[] = [
  { key: 'welcome', label: 'Application received', vars: '{name} {ref} {service} {link}' },
  { key: 'status', label: 'Status update (new step)', vars: '{name} {ref} {status} {next} {link}' },
  { key: 'quote', label: 'Quote ready', vars: '{name} {ref} {service} {total} {link}' },
  { key: 'confirmed', label: 'Order confirmed', vars: '{name} {ref} {service} {total} {link}' },
  { key: 'payment', label: 'Payment request', vars: '{name} {ref} {item} {amount} {link}' },
  { key: 'paid', label: 'Payment received', vars: '{name} {ref} {item} {amount} {receipt} {link}' },
  { key: 'message', label: 'New message from advisor', vars: '{name} {ref} {text} {link}' },
  { key: 'document', label: 'New document shared', vars: '{name} {ref} {document} {link}' },
  { key: 'decision', label: 'Authority decision', vars: '{name} {ref} {status} {reason} {link}' },
  { key: 'teamApplication', label: 'New application (team)', team: true, vars: '{name} {phone} {email} {service} {ref} {link}' },
  { key: 'teamPayment', label: 'Payment received (team)', team: true, vars: '{name} {ref} {item} {amount} {link}' },
  { key: 'teamMessage', label: 'Client message (team)', team: true, vars: '{name} {ref} {text} {link}' },
  { key: 'teamSlip', label: 'Transfer slip uploaded (team)', team: true, vars: '{name} {ref} {item} {amount} {link}' },
];

const site = () => (typeof window !== 'undefined' ? window.location.origin : '');

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="admin-label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

type TabKey = (typeof TABS)[number][0];
const PAGES: Record<string, { eyebrow: string; title: string; subtitle: string; tabs: TabKey[] }> = {
  steps: { eyebrow: 'Applications', title: 'Application steps', subtitle: 'The steps of every client file, the text the client sees for each step, and which steps send a message.', tabs: ['steps'] },
  payments: { eyebrow: 'Money', title: 'Online payments', subtitle: 'Card payment provider, bank transfer details and receipts.', tabs: ['payments'] },
  whatsapp: { eyebrow: 'Messages', title: 'WhatsApp', subtitle: 'WhatsApp Cloud API, approved templates and a test message.', tabs: ['whatsapp'] },
  documents: { eyebrow: 'Messages', title: 'Emails & PDFs', subtitle: 'The texts of every email and WhatsApp to clients and your team, and the quote and receipt PDFs.', tabs: ['clientMail', 'pdf'] },
};

/** One part of the client system on its own page (Abu Dhabi Golden Visa admin layout and workflow). */
export function ClientSystemPage({ page }: { page: keyof typeof PAGES }) {
  const [wa, setWa] = useState<'setup' | 'auto' | 'test' | 'log'>('setup');
  const tabBtn = (on: boolean) => cn('rounded-xl px-4 py-2 text-sm font-bold ring-1', on ? 'bg-gradient-to-b from-[#e8c766] to-[#c9a032] text-[#1a1406] ring-transparent' : 'bg-white text-gray-700 ring-gray-200');
  if (page === 'steps') {
    return (
      <div className="space-y-6">
        <PageHead eyebrow="Application steps" title="Application steps" />
        <StepsTab />
      </div>
    );
  }
  if (page === 'payments') {
    return (
      <div className="space-y-6">
        <PageHead eyebrow="Payments" title="Online payments" badge={<PayBadge />} />
        <p className="-mt-3 text-sm text-gray-500">Clients pay by card from their file. The payment confirms itself, the receipt is created and sent on WhatsApp and email, and the file moves forward.</p>
        <PaymentsOverview part="kpi" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <PaymentsTab />
          <PaymentsOverview part="hooks" />
        </div>
        <PaymentsOverview part="list" />
      </div>
    );
  }
  if (page === 'whatsapp') {
    return (
      <div className="space-y-6">
        <PageHead eyebrow="WhatsApp" title="Every update, on WhatsApp." badge={<WaBadge />} />
        <div className="flex flex-wrap gap-2">
          {([['setup', 'Setup'], ['auto', 'Automatic messages'], ['test', 'Send a test'], ['log', 'Message log']] as const).map(([k, l]) => (
            <button key={k} type="button" className={tabBtn(wa === k)} onClick={() => setWa(k)}>{l}</button>
          ))}
        </div>
        {wa === 'log' ? <MessageLog channel="whatsapp" /> : <WhatsAppTab key={wa} part={wa} />}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <PageHead eyebrow="Emails & PDFs" title="Your quotes, receipts and emails, your way." />
      <PdfTab />
      <div>
        <h2 className="mb-3 font-display text-2xl font-semibold text-gray-900">Emails</h2>
        <MessagesTab />
      </div>
      <AdminNotifyCard />
      <MessageLog channel="email" />
    </div>
  );
}

export default function ClientSystemSettings() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('portal');
  return (
    <div className="space-y-6">
      <PageTitle title="Client system" subtitle="Client dashboard, quotes, payments, WhatsApp, emails and PDFs" />
      <div className="flex flex-wrap gap-2">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cn('rounded-full px-4 py-2 text-sm font-bold', tab === k ? 'bg-ink text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200')}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'portal' && <PortalTab />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'whatsapp' && <WhatsAppTab />}
      {tab === 'clientMail' && <MessagesTab />}
      {tab === 'pdf' && <PdfTab />}
      {tab === 'steps' && <StepsTab />}
    </div>
  );
}

function SaveBar({ save, saving }: { save: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end">
      <Btn onClick={save} loading={saving}>
        <Save className="h-4 w-4" /> Save
      </Btn>
    </div>
  );
}

function PortalTab() {
  const { value: v, setValue, save, saving } = useSetting<any>('portal');
  if (!v) return <Spinner />;
  const set = (k: string, x: any) => setValue({ ...v, [k]: x });
  return (
    <Card title="Client dashboard" className="p-0">
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <Field label="Dashboard address" hint="e.g. https://app.goldenvisauae.ai — set this only after the subdomain works (DNS + SSL in xCloud). Empty: clients use goldenvisauae.ai/account.">
            <input className="admin-input" value={v.url} onChange={(e) => set('url', e.target.value)} placeholder="https://app.goldenvisauae.ai" />
          </Field>
        </div>
        <Field label="Default advisor name" hint="Shown to clients whose file has no advisor of its own.">
          <input className="admin-input" value={v.advisorName} onChange={(e) => set('advisorName', e.target.value)} />
        </Field>
        <Field label="Default advisor WhatsApp / phone">
          <input className="admin-input" value={v.advisorPhone} onChange={(e) => set('advisorPhone', e.target.value)} placeholder="+971…" />
        </Field>
        <div className="md:col-span-2">
          <SaveBar save={() => save()} saving={saving} />
        </div>
      </div>
    </Card>
  );
}

function PaymentsTab() {
  const { value: v, setValue, save, saving } = useSetting<any>('payments');
  if (!v) return <Spinner />;
  const set = (k: string, x: any) => setValue({ ...v, [k]: x });
  const inp = (k: string, ph = '', secret = false) => <input className="admin-input" type={secret ? 'password' : 'text'} autoComplete="off" value={v[k] ?? ''} onChange={(e) => set(k, e.target.value)} onFocus={(e) => secret && e.target.select()} placeholder={ph} />;
  return (
    <div className="space-y-6">
      <Card title="Online card payments" className="p-0">
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Payment provider">
            <select className="admin-input" value={v.provider} onChange={(e) => set('provider', e.target.value)}>
              <option value="none">Manual (own payment links / bank transfer)</option>
              <option value="ziina">Ziina</option>
              <option value="stripe">Stripe</option>
              <option value="totalpay">TotalPay</option>
              <option value="ngenius">Network International (N-Genius)</option>
              <option value="telr">Telr</option>
            </select>
          </Field>
          <div className="flex items-end gap-6">
            <Toggle checked={v.test} onChange={(x) => set('test', x)} label="Test mode" />
            <Field label="Currency">
              <input className="admin-input !w-24" value={v.currency} onChange={(e) => set('currency', e.target.value.toUpperCase().slice(0, 3))} />
            </Field>
          </div>
          {v.provider === 'ziina' && <Field label="Ziina API access token">{inp('ziinaToken', '', true)}</Field>}
          {v.provider === 'stripe' && (
            <>
              <Field label="Stripe secret key (sk_…)">{inp('stripeSecret', 'sk_live_…', true)}</Field>
              <Field label="Stripe webhook signing secret (whsec_…)">{inp('stripeWebhook', 'whsec_…', true)}</Field>
            </>
          )}
          {v.provider === 'totalpay' && (
            <>
              <Field label="TotalPay merchant key">{inp('totalpayKey')}</Field>
              <Field label="TotalPay password">{inp('totalpayPass', '', true)}</Field>
              <Field label="TotalPay checkout host">{inp('totalpayHost')}</Field>
            </>
          )}
          {v.provider === 'ngenius' && (
            <>
              <Field label="N-Genius API key">{inp('ngeniusKey', '', true)}</Field>
              <Field label="Outlet reference">{inp('ngeniusOutlet')}</Field>
            </>
          )}
          {v.provider === 'telr' && (
            <>
              <Field label="Telr store ID">{inp('telrStore')}</Field>
              <Field label="Telr authentication key">{inp('telrKey', '', true)}</Field>
            </>
          )}
          {v.provider !== 'none' && (
            <div className="md:col-span-2 rounded-xl bg-gray-50 p-4 text-xs text-gray-600">
              Webhook address to paste in your {v.provider} dashboard: <b className="select-all">{site()}/api/pay/webhook/{v.provider}</b>
              <br />
              Every payment is confirmed by asking {v.provider} directly or by checking its signature, never only by the address the client returns to.
            </div>
          )}
          <div className="md:col-span-2 grid gap-3 md:grid-cols-3">
            <Toggle checked={v.payOnQuote} onChange={(x) => set('payOnQuote', x)} label='"Pay & confirm" button on the quote' />
            <Toggle checked={v.autoStage} onChange={(x) => set('autoStage', x)} label='Move to "Payment received" when all is paid' />
            <Toggle checked={v.receiptWa} onChange={(x) => set('receiptWa', x)} label="Send the receipt PDF on WhatsApp" />
          </div>
          <div className="md:col-span-2">
            <Field label="Text above the payment buttons">
              <textarea className="admin-input min-h-[70px]" value={v.payText} onChange={(e) => set('payText', e.target.value)} />
            </Field>
          </div>
        </div>
      </Card>
      <Card title="Card fee (optional)" className="p-0">
        <div className="grid gap-4 p-5 md:grid-cols-4">
          <div className="md:col-span-4">
            <Toggle checked={v.feeOn} onChange={(x) => set('feeOn', x)} label="Add a card fee (the client picks a UAE or an international card and sees the fee before paying)" />
          </div>
          {v.feeOn && (
            <>
              <Field label="UAE card %">{inp('feeLocalPct')}</Field>
              <Field label="International card %">{inp('feeIntlPct')}</Field>
              <Field label="Fixed fee (AED)">{inp('feeFixed')}</Field>
            </>
          )}
        </div>
      </Card>
      <Card title="Bank transfer" className="p-0">
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Toggle checked={v.bankOn} onChange={(x) => set('bankOn', x)} label="Offer bank transfer (the client uploads the transfer slip; you press “Mark paid”)" />
          </div>
          {v.bankOn && (
            <>
              <Field label="Bank">{inp('bankName')}</Field>
              <Field label="Account name">{inp('bankHolder')}</Field>
              <Field label="IBAN">{inp('bankIban')}</Field>
              <Field label="Account number">{inp('bankAccount')}</Field>
              <Field label="SWIFT / BIC">{inp('bankSwift')}</Field>
              <Field label="Note for the client">
                <input className="admin-input" value={v.bankNote} onChange={(e) => set('bankNote', e.target.value)} placeholder="Please write your reference number in the transfer." />
              </Field>
            </>
          )}
        </div>
      </Card>
      <SaveBar save={() => save({ ...v, feeLocalPct: Number(v.feeLocalPct) || 0, feeIntlPct: Number(v.feeIntlPct) || 0, feeFixed: Number(v.feeFixed) || 0 })} saving={saving} />
    </div>
  );
}

function WhatsAppTab({ part = 'all' }: { part?: 'all' | 'setup' | 'auto' | 'test' } = {}) {
  const { value: v, setValue, save, saving } = useSetting<any>('whatsapp');
  const show = (p: string) => part === 'all' || part === p;
  const [to, setTo] = useState('');
  const [testing, setTesting] = useState(false);
  if (!v) return <Spinner />;
  const set = (k: string, x: any) => setValue({ ...v, [k]: x });
  const inp = (k: string, ph = '', secret = false) => <input className="admin-input" type={secret ? 'password' : 'text'} autoComplete="off" value={v[k] ?? ''} onChange={(e) => set(k, e.target.value)} onFocus={(e) => secret && e.target.select()} placeholder={ph} />;
  async function test() {
    setTesting(true);
    try {
      const r = await api<{ result: { ok: boolean; error: string } }>('/api/admin/client-system/test', 'POST', { to });
      toast(r.result.ok ? 'Test message sent — check WhatsApp' : r.result.error, r.result.ok ? 'success' : 'error');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setTesting(false);
    }
  }
  return (
    <div className="space-y-6">
      {part === 'setup' && <WaChecklist v={v} />}
      {show('setup') && (
      <Card title="Connection" className="p-0">
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Toggle checked={v.mode === 'cloud'} onChange={(x) => set('mode', x ? 'cloud' : 'off')} label="Send automatic WhatsApp messages (Cloud API)" />
          </div>
          <Field label="Phone number ID" hint="Meta → WhatsApp → API setup">{inp('phoneNumberId')}</Field>
          <Field label="WhatsApp Business account ID">{inp('businessId')}</Field>
          <Field label="Permanent access token" hint="System user token from Meta Business Settings (does not expire).">{inp('accessToken', '', true)}</Field>
          <Field label="App secret" hint="Meta app → Settings → Basic. Needed to accept client replies.">{inp('appSecret', '', true)}</Field>
          <Field label="Webhook verify word" hint="Any word you choose; type the same in Meta.">{inp('verifyToken', 'e.g. gvu-2026')}</Field>
          <Field label="Template language code">{inp('templateLang', 'en')}</Field>
          <div className="md:col-span-2 rounded-xl bg-gray-50 p-4 text-xs text-gray-600">
            Webhook (callback URL) for Meta: <b className="select-all">{site()}/api/whatsapp/webhook</b> — subscribe to <b>messages</b>. Client replies then appear in their file.
          </div>
          <div className="md:col-span-2">
            <Field label="Team WhatsApp numbers (one per line)" hint="They get the team alerts: new application, payment, client message, transfer slip.">
              <textarea className="admin-input min-h-[60px]" value={v.teamNumbers} onChange={(e) => set('teamNumbers', e.target.value)} placeholder="+9715…" />
            </Field>
          </div>
        </div>
      </Card>
      )}
      {show('auto') && (
      <Card title="Automatic messages and approved templates" className="p-0">
        <div className="p-5">
          <p className="mb-4 text-xs text-gray-500">
            Inside 24 hours after a client wrote to you, the full text from the Messages tab is sent. Outside that window Meta only delivers approved templates: write the template name for each message
            (its body values are the words shown on the right, in that order, without the link). A template name ending in <b>_file</b> or with <b>_pdf_</b> in it also carries the PDF (quote or receipt); names ending in <b>_btn_v1</b> have an “Open my file” button. Use “Create all templates in Meta” below to get them all.
          </p>
          <div className="space-y-2">
            {EVENTS.map((e) => (
              <div key={e.key} className="grid items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 md:grid-cols-[auto_1fr_220px]">
                <Toggle checked={v.autos?.[e.key] !== false} onChange={(x) => set('autos', { ...v.autos, [e.key]: x })} />
                <span className="text-sm">
                  {e.label} <span className="text-xs text-gray-400">{e.vars.replace(' {link}', '')}</span>
                </span>
                <input className="admin-input !py-1.5 text-xs" placeholder="template name" value={v.templates?.[e.key] || ''} onChange={(x) => set('templates', { ...v.templates, [e.key]: x.target.value.trim() })} />
              </div>
            ))}
          </div>
        </div>
      </Card>
      )}
      {(show('setup') || show('auto')) && <SaveBar save={() => save()} saving={saving} />}
      {show('setup') && <MetaTemplatesCard reload={async () => { try { const r = await api<any>('/api/admin/settings/whatsapp'); if (r?.value) setValue(r.value); } catch {} }} />}
      {show('test') && (
      <Card title="Send a test" className="p-0">
        <div className="flex flex-wrap items-end gap-3 p-5">
          <Field label="WhatsApp number">
            <input className="admin-input" value={to} onChange={(e) => setTo(e.target.value)} placeholder="+9715…" />
          </Field>
          <Btn variant="dark" loading={testing} onClick={test}>
            <Send className="h-4 w-4" /> Send test
          </Btn>
          <p className="w-full text-xs text-gray-400">Save first. If this number has not written to you in the last 24 hours, Meta's “hello_world” template is used.</p>
        </div>
      </Card>
      )}
    </div>
  );
}

/** The same WhatsApp templates as the Abu Dhabi Golden Visa site: sent to Meta for approval in one click,
 *  then the approved names are filled in above ("Check approval"). */
function MetaTemplatesCard({ reload }: { reload: () => void }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [rows, setRows] = useState<{ name: string; status: string }[]>([]);
  async function run(action: 'create' | 'sync') {
    setBusy(action);
    try {
      const r = await api<{ result: { ok: boolean; msg: string; rows?: { name: string; status: string }[] } }>('/api/admin/client-system/templates', 'POST', { action });
      setMsg(r.result.msg);
      if (r.result.rows) setRows(r.result.rows);
      toast(r.result.ok ? 'Done' : 'See the message below', r.result.ok ? 'success' : 'error');
      if (action === 'sync') reload();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }
  return (
    <Card title="Approved message templates (Meta)" className="p-0">
      <div className="space-y-3 p-5">
        <p className="text-xs text-gray-500">
          One click sends every message template to Meta for approval: file opened, status update, quote with PDF, order confirmed, payment request, payment received with the receipt PDF, new message, new
          document, decision, and the team alerts. Each has an “Open my file” button. Approval usually takes a few minutes; then press “Check approval” and the approved names are filled in above.
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn loading={busy === 'create'} onClick={() => run('create')}>Create all templates in Meta</Btn>
          <Btn variant="dark" loading={busy === 'sync'} onClick={() => run('sync')}>Check approval</Btn>
          <a className="rounded-xl bg-white px-4 py-2 text-sm font-bold ring-1 ring-gray-200" href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noopener noreferrer">Open templates in Meta ↗</a>
        </div>
        {msg && <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-700">{msg}</p>}
        {rows.length > 0 && (
          <ul className="grid gap-1 text-xs md:grid-cols-2">
            {rows.map((r) => (
              <li key={r.name} className="flex justify-between gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
                <span className="font-mono">{r.name}</span>
                <b className={r.status === 'approved' ? 'text-emerald-700' : r.status.startsWith('rejected') ? 'text-red-600' : 'text-amber-700'}>{r.status}</b>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

const fmtAed = (n: number) => `AED ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtWhen = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' });
const goldBtn = 'rounded-xl bg-gradient-to-b from-[#e8c766] to-[#c9a032] px-4 py-2 text-sm font-bold text-[#1a1406]';

function PageHead({ eyebrow, title, badge }: { eyebrow: string; title: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-gray-400">{eyebrow}</p>
        <h1 className="font-display text-3xl font-semibold text-gray-900">{title}</h1>
      </div>
      {badge}
    </div>
  );
}
const Pill = ({ on, children }: { on: boolean; children: React.ReactNode }) => (
  <span className={cn('rounded-full px-3 py-1 text-xs font-bold', on ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200')}>{children}</span>
);

/** WhatsApp setup checklist (n of 5 done). */
function WaChecklist({ v }: { v: any }) {
  const filled = Object.values(v.templates || {}).filter(Boolean).length;
  const items = [
    { ok: !!(v.phoneNumberId && v.businessId), label: 'Phone number ID and Business account ID' },
    { ok: !!v.accessToken, label: 'Permanent access token' },
    { ok: v.mode === 'cloud', label: 'Mode set to “Cloud API”' },
    { ok: !!(v.appSecret && v.verifyToken), label: 'Webhook connected · incoming messages', hint: `Callback URL in Meta: ${site()}/api/whatsapp/webhook (field “messages”)` },
    { ok: filled >= EVENTS.length - 1, label: `Approved message templates (${filled} of ${EVENTS.length} filled in)` },
  ];
  const done = items.filter((x) => x.ok).length;
  return (
    <Card title="Setup checklist" actions={<Pill on={done === items.length}>{done} of {items.length} done</Pill>} className="p-0">
      <ul className="space-y-2 p-5">
        {items.map((x) => (
          <li key={x.label} className="flex items-start gap-3">
            <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold', x.ok ? 'bg-gradient-to-b from-[#e8c766] to-[#c9a032] text-[#1a1406]' : 'bg-gray-100 text-gray-400')}>{x.ok ? '✓' : ''}</span>
            <span className="text-sm">
              <b className="text-gray-900">{x.label}</b>
              {x.hint && <span className="block text-xs text-gray-500">{x.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Email or WhatsApp message log (latest 150). */
function MessageLog({ channel }: { channel: 'whatsapp' | 'email' }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { api<any>(`/api/admin/client-system/overview?what=log&channel=${channel}`).then((r) => setRows(r.rows)).catch(() => setRows([])); }, [channel]);
  return (
    <Card title={channel === 'email' ? 'Email log' : 'Message log'} className="p-0">
      {!rows ? <div className="p-5"><Spinner /></div> : rows.length === 0 ? <p className="p-5 text-sm text-gray-500">Nothing sent yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[0.68rem] font-extrabold uppercase tracking-wider text-gray-400"><th className="px-5 py-2">When</th><th className="px-3 py-2">To</th><th className="px-3 py-2">Message</th><th className="px-3 py-2">File</th><th className="px-3 py-2">Result</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-5 py-2 text-xs text-gray-500">{fmtWhen(r.at)}</td>
                  <td className="px-3 py-2 text-xs">{r.direction === 'in' ? '← ' : ''}{r.to}</td>
                  <td className="max-w-md px-3 py-2 text-xs text-gray-700"><b>{r.event}</b>{r.text ? <span className="block truncate text-gray-500">{r.text}</span> : null}</td>
                  <td className="px-3 py-2 text-xs">{r.appId ? <a className="font-mono font-bold hover:underline" href={`/admin/applications/${r.appId}`}>{r.ref || 'Open'}</a> : '—'}</td>
                  <td className="px-3 py-2 text-xs">{r.ok ? <span className="font-bold text-emerald-700">Sent</span> : <span className="text-red-600">{r.error || 'Failed'}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** Online payments: totals, provider settings, webhook addresses and all payments. */
function PaymentsOverview({ part }: { part: 'kpi' | 'list' | 'hooks' }) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { if (part !== 'hooks') api<any>('/api/admin/client-system/overview?what=payments').then(setD).catch(() => setD({ kpi: {}, rows: [] })); }, [part]);
  if (part === 'hooks') {
    const list = [['Ziina', 'ziina'], ['Stripe', 'stripe'], ['TotalPay', 'totalpay'], ['Network International (N-Genius)', 'ngenius'], ['Telr', 'telr']];
    return (
      <Card title="Webhook addresses" className="p-0">
        <div className="space-y-2 p-5">
          <p className="text-xs text-gray-500">Add the one for your provider in its dashboard, so payments confirm even if the client closes the browser.</p>
          {list.map(([n, k]) => {
            const url = `${site()}/api/pay/webhook/${k}`;
            return (
              <div key={k} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
                <span className="min-w-0 flex-1 text-xs"><b className="block text-gray-900">{n}</b><span className="break-all text-gray-500">{url}</span></span>
                <button type="button" className="rounded-lg bg-white px-3 py-1 text-xs font-bold ring-1 ring-gray-200" onClick={() => { navigator.clipboard?.writeText(url); toast('Copied'); }}>Copy</button>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }
  if (!d) return <Spinner />;
  if (part === 'kpi') {
    const k = d.kpi || {};
    const cards = [['Received this month', fmtAed(k.month)], ['Received in total', fmtAed(k.total)], ['Waiting for payment', fmtAed(k.waiting)], ['Open requests', String(k.open ?? 0)]];
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([l, v], i) => (
          <div key={l} className={cn('rounded-2xl p-5 ring-1', i === 3 ? 'bg-gradient-to-br from-[#fbf0c9] to-[#f1d98a] ring-transparent' : 'bg-white ring-gray-100')}>
            <p className="text-xs text-gray-500">{l}</p>
            <b className="mt-1 block font-display text-2xl text-gray-900">{v}</b>
          </div>
        ))}
      </div>
    );
  }
  return (
    <Card title="All payments" className="p-0">
      {d.rows.length === 0 ? <p className="p-5 text-sm text-gray-500">No payments yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[0.68rem] font-extrabold uppercase tracking-wider text-gray-400"><th className="px-5 py-2">Date</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">File</th><th className="px-3 py-2">Description</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Method</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {d.rows.map((r: any) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-5 py-2 text-xs text-gray-500">{fmtWhen(r.at)}</td>
                  <td className="px-3 py-2">{r.client}</td>
                  <td className="px-3 py-2"><a className="font-mono text-xs font-bold hover:underline" href={`/admin/applications/${r.appId}`}>{r.ref}</a></td>
                  <td className="px-3 py-2 text-gray-600">{r.label}{r.receiptNo ? <span className="block text-xs text-gray-400">Receipt {r.receiptNo}</span> : null}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtAed(r.amount)}</td>
                  <td className="px-3 py-2"><span className={cn('rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold', r.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>{r.status === 'paid' ? 'Paid' : 'Waiting'}</span></td>
                  <td className="px-3 py-2 text-xs text-gray-500">{r.method || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** "Email me the admin notifications": who gets the team emails and for what. */
function AdminNotifyCard() {
  const { value: v, setValue, save, saving } = useSetting<any>('smtp');
  if (!v) return <Spinner />;
  const on = v.notifyOn || {};
  const kinds = [['applications', 'New applications'], ['leads', 'Website enquiries'], ['messages', 'Client messages'], ['accounts', 'New client accounts'], ['subscribers', 'Newsletter sign-ups']];
  return (
    <Card title="Email me the admin notifications" className="p-0">
      <div className="space-y-3 p-5">
        <Field label="Send to (one or more addresses)">
          <textarea className="admin-input min-h-[56px]" value={v.notifyEmail || ''} onChange={(e) => setValue({ ...v, notifyEmail: e.target.value })} placeholder="visa@goldenvisauae.ai" />
        </Field>
        <div className="flex flex-wrap gap-4">
          {kinds.map(([k, l]) => <Toggle key={k} checked={on[k] !== false} onChange={(x) => setValue({ ...v, notifyOn: { ...on, [k]: x } })} label={l} />)}
        </div>
        <SaveBar save={() => save()} saving={saving} />
      </div>
    </Card>
  );
}

function PayBadge() {
  const [p, setP] = useState<any>(null);
  useEffect(() => { api<any>('/api/admin/settings/payments').then((r) => setP(r.value)).catch(() => null); }, []);
  if (!p) return null;
  const live = p.provider && p.provider !== 'none';
  return <Pill on={live}>{live ? `Live · ${p.provider === 'ngenius' ? 'N-Genius' : p.provider[0].toUpperCase() + p.provider.slice(1)}` : 'Manual · no card provider'}</Pill>;
}
function WaBadge() {
  const [w, setW] = useState<any>(null);
  useEffect(() => { api<any>('/api/admin/settings/whatsapp').then((r) => setW(r.value)).catch(() => null); }, []);
  if (!w) return null;
  const ok = w.mode === 'cloud' && w.accessToken && w.phoneNumberId;
  return <Pill on={!!ok}>{ok ? 'Cloud API connected' : 'Not connected yet'}</Pill>;
}

function MessagesTab() {
  const { value: v, setValue, save, saving } = useSetting<any>('clientMail');
  if (!v) return <Spinner />;
  const setEv = (k: string, patch: any) => setValue({ ...v, events: { ...v.events, [k]: { ...v.events[k], ...patch } } });
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">One text per message, used for the email and for WhatsApp. Lines written “Label: value” show as a neat table; a line with only a link becomes a button.</p>
      {EVENTS.map((e) => {
        const t = v.events?.[e.key] || { on: true, subject: '', body: '' };
        return (
          <Card key={e.key} title={e.label} actions={<Toggle checked={t.on !== false} onChange={(x) => setEv(e.key, { on: x })} label="Email on" />} className="p-0">
            <div className="space-y-3 p-5">
              <input className="admin-input" value={t.subject} onChange={(x) => setEv(e.key, { subject: x.target.value })} placeholder="Email subject" />
              <textarea className="admin-input min-h-[140px] font-mono text-xs" value={t.body} onChange={(x) => setEv(e.key, { body: x.target.value })} />
              <p className="text-xs text-gray-400">Words you can use: {e.vars}</p>
            </div>
          </Card>
        );
      })}
      <Card title="Sign-off under client emails" className="p-0">
        <div className="p-5">
          <textarea className="admin-input min-h-[60px]" value={v.signOff} onChange={(e) => setValue({ ...v, signOff: e.target.value })} />
        </div>
      </Card>
      <SaveBar save={() => save()} saving={saving} />
    </div>
  );
}

function PdfTab() {
  const { value: v, setValue, save, saving } = useSetting<any>('pdf');
  if (!v) return <Spinner />;
  const set = (k: string, x: any) => setValue({ ...v, [k]: x });
  return (
    <Card title="Quote & receipt PDFs" className="p-0">
      <div className="grid gap-4 p-5 md:grid-cols-2">
        <Field label="Quote title">
          <input className="admin-input" value={v.quoteTitle} onChange={(e) => set('quoteTitle', e.target.value)} />
        </Field>
        <Field label="Receipt title">
          <input className="admin-input" value={v.receiptTitle} onChange={(e) => set('receiptTitle', e.target.value)} />
        </Field>
        <Field label="Accent colour">
          <input className="admin-input" value={v.accent} onChange={(e) => set('accent', e.target.value)} placeholder="#b8901f" />
        </Field>
        <div />
        <div className="md:col-span-2">
          <Field label="Intro text on quotes">
            <textarea className="admin-input min-h-[60px]" value={v.intro} onChange={(e) => set('intro', e.target.value)} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Notes on every quote (one per line)">
            <textarea className="admin-input min-h-[80px]" value={v.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
        <Field label="Signature name">
          <input className="admin-input" value={v.signName} onChange={(e) => set('signName', e.target.value)} />
        </Field>
        <Field label="Signature title">
          <input className="admin-input" value={v.signTitle} onChange={(e) => set('signTitle', e.target.value)} />
        </Field>
        <div className="md:col-span-2">
          <Field label="Footer (empty: company name, address, phone, email from Site settings)">
            <input className="admin-input" value={v.footer} onChange={(e) => set('footer', e.target.value)} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <SaveBar save={() => save()} saving={saving} />
        </div>
      </div>
    </Card>
  );
}

/** WhatsApp style text box: *bold*, _italic_, ~strike~, emoji, and a preview of the message. */
function WaBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrap = (m: string) => {
    const t = ref.current;
    if (!t) return;
    const [x, y] = [t.selectionStart, t.selectionEnd];
    const sel = value.slice(x, y) || 'text';
    onChange(value.slice(0, x) + m + sel + m + value.slice(y));
    setTimeout(() => { t.focus(); t.setSelectionRange(x + m.length, x + m.length + sel.length); }, 0);
  };
  const put = (e: string) => {
    const t = ref.current;
    const x = t ? t.selectionStart : value.length;
    onChange(value.slice(0, x) + e + value.slice(x));
  };
  const html = value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<b>$2</b>').replace(/(^|[\s(])_([^_\n]+)_/g, '$1<i>$2</i>').replace(/(^|[\s(])~([^~\n]+)~/g, '$1<s>$2</s>')
    .replace(/\n/g, '<br>');
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-gray-200 focus-within:ring-[#c9a032]">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50 px-2 py-1">
        <button type="button" onClick={() => wrap('*')} className="rounded px-2 py-0.5 text-sm font-extrabold hover:bg-white" title="Bold">B</button>
        <button type="button" onClick={() => wrap('_')} className="rounded px-2 py-0.5 text-sm italic hover:bg-white" title="Italic">I</button>
        <button type="button" onClick={() => wrap('~')} className="rounded px-2 py-0.5 text-sm line-through hover:bg-white" title="Strike">S</button>
        <span className="mx-1 h-4 w-px bg-gray-200" />
        {['✅', '📄', '💳', '📅', '🎉', '⏳', '📎', '🙏'].map((e) => (
          <button key={e} type="button" onClick={() => put(e)} className="rounded px-1 py-0.5 hover:bg-white">{e}</button>
        ))}
      </div>
      <textarea ref={ref} rows={3} className="block w-full resize-y border-0 bg-white px-3 py-2 text-sm outline-none" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value.trim() && (
        <div className="border-t border-gray-100 bg-[#efeae2] px-3 py-2">
          <div className="max-w-[90%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-[13px] leading-snug text-gray-800 shadow-sm" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
    </div>
  );
}

/** Application steps (the Abu Dhabi Golden Visa layout): per service list, numbered steps with sections,
 *  the WhatsApp message of each step, how many open files are on it, move / add / remove, restore. */
function StepsTab() {
  const { value: v, setValue, save, saving } = useSetting<any>('steps');
  const [which, setWhich] = useState<'golden' | 'other'>('golden');
  const [counts, setCounts] = useState<any>(null);
  useEffect(() => { api<any>('/api/admin/client-system/step-counts').then(setCounts).catch(() => null); }, []);
  if (!v) return <Spinner />;
  const list: any[] = v[which] || [];
  const per: Record<string, number> = counts?.[which]?.perStep || {};
  const setList = (l: any[]) => setValue({ ...v, [which]: l });
  const upd = (i: number, p: any) => setList(list.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => {
    const l = [...list];
    const j = i + d;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    setList(l);
  };
  const add = (i: number) => {
    const l = [...list];
    let n = l.length + 1;
    while (l.some((x) => x.id === `step-${n}`)) n++;
    l.splice(i + 1, 0, { id: `step-${n}`, name: '', group: l[i]?.group || 'Processing', next: '' });
    setList(l);
  };
  const del = (i: number) => {
    const s = list[i];
    const n = per[s.id] || 0;
    if (!window.confirm(n ? `${n} file(s) are on “${s.name}”. They will show the step before it. Remove this step?` : `Remove “${s.name || 'this step'}”?`)) return;
    setList(list.filter((_, k) => k !== i));
  };
  const groups = Array.from(new Set(list.map((x) => x.group).filter(Boolean)));
  const label = which === 'golden' ? 'Golden Visa' : 'Other services';
  const KEEP = ['quote-sent', 'quote-ok', 'pay-wait', 'paid', 'approved'];
  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold text-gray-900">The steps your clients <span className="text-[#b8862f]">see and follow.</span></h2>
      <nav className="flex flex-wrap gap-2" aria-label="Service">
        {(['golden', 'other'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setWhich(k)} className={cn('inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ring-1', which === k ? 'bg-gradient-to-b from-[#e8c766] to-[#c9a032] text-[#1a1406] ring-transparent' : 'bg-white text-gray-700 ring-gray-200')}>
            {k === 'golden' ? 'Golden Visa' : 'Other services'}
            {counts?.[k]?.files ? <em className="rounded-full bg-gray-900 px-2 py-0.5 text-[0.65rem] not-italic text-[#f2d27a]">{counts[k].files}</em> : null}
          </button>
        ))}
      </nav>
      <Card className="p-0">
        <div className="space-y-4 p-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{label} <small className="font-normal text-gray-400">· {list.length} steps</small></h3>
            <p className="mt-1 text-xs text-gray-500">
              Each list has its own steps; a file follows the steps of its service. Rename a step, change the message the client gets, move it up or down, add or remove steps. Untick “Send this message on
              WhatsApp &amp; email” for steps the client does not need to hear about. Keep the steps quote-sent, quote-ok, pay-wait, paid and approved: quotes, payments and decisions move files to them
              automatically.
            </p>
          </div>
          <datalist id="step-groups">{groups.map((g) => <option key={g} value={g} />)}</datalist>
          <ol className="space-y-3">
            {list.map((s, i) => {
              const newGroup = i === 0 || list[i - 1].group !== s.group;
              return (
                <li key={i}>
                  {newGroup && s.group && <p className="mb-2 mt-4 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-[#8a6a14]">{s.group}</p>}
                  <div className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-200 md:grid-cols-[44px_1fr_auto]">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#fbf4dd] font-mono text-sm font-bold text-[#8a6a14]">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 space-y-2">
                      <div className="grid gap-2 md:grid-cols-[1fr_200px_150px]">
                        <input className="admin-input" aria-label="Step name" value={s.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="Step name, e.g. Medical test" />
                        <input className="admin-input" aria-label="Section" list="step-groups" value={s.group} onChange={(e) => upd(i, { group: e.target.value })} placeholder="Section" />
                        <input className="admin-input font-mono text-xs" aria-label="Step id" title={KEEP.includes(s.id) ? 'Used by quotes, payments and decisions: keep this id' : 'Step id'} readOnly={KEEP.includes(s.id)} value={s.id} onChange={(e) => upd(i, { id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} placeholder="id" />
                      </div>
                      <WaBox value={s.next || ''} onChange={(x) => upd(i, { next: x })} placeholder="Message the client sees at this step" />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" className="accent-[#c9a032]" checked={s.notify !== false} onChange={(e) => upd(i, { notify: e.target.checked })} /> Send this message on WhatsApp &amp; email
                        </label>
                        {per[s.id] ? <small className="text-xs text-gray-500">{per[s.id]} file(s) on this step now</small> : null}
                      </div>
                    </div>
                    <div className="flex flex-row flex-wrap items-start gap-1 md:flex-col">
                      <button type="button" className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold ring-1 ring-gray-200 disabled:opacity-40" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</button>
                      <button type="button" className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold ring-1 ring-gray-200 disabled:opacity-40" onClick={() => move(i, 1)} disabled={i === list.length - 1} title="Move down">↓</button>
                      <button type="button" className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold ring-1 ring-gray-200" onClick={() => add(i)} title="Add a step below">+ Add</button>
                      <button type="button" className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-red-600 ring-1 ring-red-100 disabled:opacity-40" onClick={() => del(i)} disabled={list.length <= 2 || KEEP.includes(s.id)} title="Remove this step">Remove</button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Btn variant="ghost" onClick={() => add(list.length - 1)}><Plus className="h-4 w-4" /> Add a step at the end</Btn>
            <Btn
              onClick={() => {
                const ids = list.map((x) => x.id);
                if (ids.some((x) => !x) || new Set(ids).size !== ids.length) return toast('Every step needs its own id', 'error');
                if (list.some((x) => !String(x.name || '').trim())) return toast('Every step needs a name', 'error');
                save();
              }}
              loading={saving}
            >
              <Save className="h-4 w-4" /> Save {label} steps
            </Btn>
          </div>
          <details className="rounded-xl bg-gray-50 p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-gray-700">Go back to the standard {label} steps</summary>
            <div className="mt-2 flex items-center gap-2">
              <Btn
                variant="dark"
                onClick={() => {
                  if (!window.confirm(`Replace the ${label} steps with the standard ones? Press Save afterwards.`)) return;
                  setList((which === 'golden' ? GOLDEN_STEPS : OTHER_STEPS).map((x) => ({ ...x })));
                }}
              >
                Restore the standard steps
              </Btn>
              <span className="text-xs text-gray-500">Then press Save.</span>
            </div>
          </details>
        </div>
      </Card>
    </div>
  );
}
