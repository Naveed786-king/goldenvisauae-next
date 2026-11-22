'use client';
// Admin → Client system: dashboard address & advisor, payments, WhatsApp, client messages, PDFs, steps.
import { useState } from 'react';
import { Save, Send, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
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

/** One part of the client system on its own page (Abu Dhabi Golden Visa admin layout). */
export function ClientSystemPage({ page }: { page: keyof typeof PAGES }) {
  const p = PAGES[page];
  const [tab, setTab] = useState<TabKey>(p.tabs[0]);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-gray-400">{p.eyebrow}</p>
        <h1 className="font-display text-3xl font-semibold text-gray-900">{p.title}</h1>
        <p className="mt-1 text-sm text-gray-500">{p.subtitle}</p>
      </div>
      {p.tabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {p.tabs.map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn('rounded-xl px-4 py-2 text-sm font-bold ring-1', tab === k ? 'bg-gradient-to-b from-[#e8c766] to-[#c9a032] text-[#1a1406] ring-transparent' : 'bg-white text-gray-700 ring-gray-200')}>
              {k === 'clientMail' ? 'Email & WhatsApp texts' : 'Quote & receipt PDFs'}
            </button>
          ))}
        </div>
      )}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'whatsapp' && <WhatsAppTab />}
      {tab === 'clientMail' && <MessagesTab />}
      {tab === 'pdf' && <PdfTab />}
      {tab === 'steps' && <StepsTab />}
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

function WhatsAppTab() {
  const { value: v, setValue, save, saving } = useSetting<any>('whatsapp');
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
      <Card title="WhatsApp Business Cloud API" className="p-0">
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
      <Card title="Messages and approved templates" className="p-0">
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
      <SaveBar save={() => save()} saving={saving} />
      <MetaTemplatesCard reload={async () => { try { const r = await api<any>('/api/admin/settings/whatsapp'); if (r?.value) setValue(r.value); } catch {} }} />
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

function StepsTab() {
  const { value: v, setValue, save, saving } = useSetting<any>('steps');
  const [which, setWhich] = useState<'golden' | 'other'>('golden');
  if (!v) return <Spinner />;
  const list: any[] = v[which] || [];
  const setList = (l: any[]) => setValue({ ...v, [which]: l });
  const move = (i: number, d: number) => {
    const l = [...list];
    const j = i + d;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    setList(l);
  };
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button type="button" onClick={() => setWhich('golden')} className={cn('rounded-full px-4 py-2 text-sm font-bold', which === 'golden' ? 'bg-gold text-ink' : 'bg-white ring-1 ring-gray-200')}>
          Golden Visa services
        </button>
        <button type="button" onClick={() => setWhich('other')} className={cn('rounded-full px-4 py-2 text-sm font-bold', which === 'other' ? 'bg-gold text-ink' : 'bg-white ring-1 ring-gray-200')}>
          Other services
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Keep the ids quote-sent, quote-ok, pay-wait, paid and approved: quotes, payments and decisions move files to those steps automatically.
      </p>
      {list.map((s, i) => (
        <Card key={i} className="p-0">
          <div className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_160px_auto]">
            <input className="admin-input" value={s.name} onChange={(e) => setList(list.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} placeholder="Step name" />
            <input className="admin-input" value={s.group} onChange={(e) => setList(list.map((x, k) => (k === i ? { ...x, group: e.target.value } : x)))} placeholder="Group" />
            <input className="admin-input font-mono text-xs" value={s.id} onChange={(e) => setList(list.map((x, k) => (k === i ? { ...x, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') } : x)))} placeholder="id" />
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Up">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => move(i, 1)} className="p-1 text-gray-400 hover:text-gray-700" aria-label="Down">
                <ArrowDown className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => confirm('Remove this step?') && setList(list.filter((_, k) => k !== i))} className="p-1 text-gray-300 hover:text-red-600" aria-label="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <textarea className="admin-input min-h-[56px] md:col-span-3" value={s.next} onChange={(e) => setList(list.map((x, k) => (k === i ? { ...x, next: e.target.value } : x)))} placeholder="What the client reads at this step" />
            <Toggle checked={s.notify !== false} onChange={(x) => setList(list.map((y, k) => (k === i ? { ...y, notify: x } : y)))} label="Notify" />
          </div>
        </Card>
      ))}
      <div className="flex justify-between">
        <Btn variant="ghost" onClick={() => setList([...list, { id: `step-${list.length + 1}`, name: 'New step', group: list[list.length - 1]?.group || 'Processing', next: '' }])}>
          <Plus className="h-4 w-4" /> Add step
        </Btn>
        <Btn
          onClick={() => {
            const ids = list.map((s) => s.id);
            if (ids.some((x) => !x) || new Set(ids).size !== ids.length) return toast('Every step needs its own id', 'error');
            save();
          }}
          loading={saving}
        >
          <Save className="h-4 w-4" /> Save steps
        </Btn>
      </div>
    </div>
  );
}
