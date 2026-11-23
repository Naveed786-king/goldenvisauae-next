'use client';
// Admin → Client system: dashboard address & advisor, payments, WhatsApp, client messages, PDFs, steps.
import { useEffect, useRef, useState } from 'react';
import { Save, Send, Plus, Eye, EyeOff } from 'lucide-react';
import { GOLDEN_STEPS, OTHER_STEPS, STEP_SERVICES } from '@/lib/portal/config';
import { SERVICE_STEPS0 } from '@/adgv/lib/stage-defs';
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
        <PortalTab />
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
          <div className="space-y-6">
            <PaymentsOverview part="hooks" />
            <HowClientsPay />
          </div>
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
              <Field label="VAT on the card fee (%)">{inp('feeVatPct', '5')}</Field>
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
      <SaveBar save={() => save({ ...v, feeLocalPct: Number(v.feeLocalPct) || 0, feeIntlPct: Number(v.feeIntlPct) || 0, feeFixed: Number(v.feeFixed) || 0, feeVatPct: v.feeVatPct === '' || v.feeVatPct === undefined ? 5 : Number(v.feeVatPct) || 0 })} saving={saving} />
      <PayTest />
    </div>
  );
}

function PayTest() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Btn variant="outline" loading={busy} onClick={async () => { setBusy(true); try { setMsg(await api<{ ok: boolean; msg: string }>('/api/admin/client-system/pay-test', 'POST')); } catch (e: any) { setMsg({ ok: false, msg: e.message }); } setBusy(false); }}>Test connection</Btn>
      {msg && <span className={cn('rounded-xl px-3 py-2 text-sm', msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>{msg.msg}</span>}
    </div>
  );
}

function HowClientsPay() {
  return (
    <Card title="How clients pay" className="p-0">
      <ol className="list-decimal space-y-2 p-5 ps-9 text-sm leading-relaxed text-gray-700">
        <li><b>Your merchant account:</b> open an account with Ziina, Stripe, TotalPay, N-Genius or Telr in your company’s name, linked to your company bank account. Paste its keys here. All card money goes from the client to <b>your</b> bank account; the website never holds money.</li>
        <li>In a client file, write the quote (items, qty, price, service fee + VAT) and press <b>Save and send to client</b>. The client gets WhatsApp + email with the order link.</li>
        <li>The client opens the order page and presses <b>Pay &amp; confirm</b>, or pays by bank transfer and uploads the slip.</li>
        <li>Secure card page → <b>Payment received</b>. The order is confirmed and the client gets “Order confirmed” on WhatsApp.</li>
        <li>The receipt PDF is created and sent on WhatsApp and email. Extra amounts later: file › Payments › Request a payment.</li>
      </ol>
    </Card>
  );
}

function WhatsAppTab({ part = 'all' }: { part?: 'all' | 'setup' | 'auto' | 'test' } = {}) {
  const { value: v, setValue, save, saving } = useSetting<any>('whatsapp');
  const show = (p: string) => part === 'all' || part === p;
  const [to, setTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [showTok, setShowTok] = useState(false);
  const [testText, setTestText] = useState('');
  const [testMode, setTestMode] = useState<'template' | 'plain'>('template');
  const { value: mail } = useSetting<any>('clientMail');
  if (!v) return <Spinner />;
  // a WhatsApp text that is the same as the email text is not stored: it then follows the email text
  const saveWa = () => {
    const texts = Object.fromEntries(Object.entries(v.waTexts || {}).filter(([k, t]) => String(t || '').trim() && String(t).trim() !== String(mail?.events?.[k]?.body || '').trim()));
    save({ ...v, waTexts: texts });
  };
  const set = (k: string, x: any) => setValue({ ...v, [k]: x });
  const inp = (k: string, ph = '', secret = false) => <input className="admin-input" type={secret ? 'password' : 'text'} autoComplete="off" value={v[k] ?? ''} onChange={(e) => set(k, e.target.value)} onFocus={(e) => secret && e.target.select()} placeholder={ph} />;
  async function test() {
    setTesting(true);
    try {
      const r = await api<{ result: { ok: boolean; error: string } }>('/api/admin/client-system/test', 'POST', { to, text: testText, mode: testMode });
      toast(r.result.ok ? 'Test message sent — check WhatsApp' : r.result.error, r.result.ok ? 'success' : 'error');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setTesting(false);
    }
  }
  return (
    <div className="space-y-6">
      {part === 'setup' && <WaChecklist v={v} reload={async () => { try { const r = await api<any>('/api/admin/settings/whatsapp'); if (r?.value) setValue(r.value); } catch {} }} />}
      {show('setup') && (
      <Card title="Connection" className="p-0">
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Mode">
              <select className="admin-input" value={v.mode} onChange={(e) => set('mode', e.target.value)}>
                <option value="cloud">Cloud API: send automatic messages</option>
                <option value="off">Off: only “Chat on WhatsApp” buttons</option>
              </select>
            </Field>
          </div>
          <Field label="Phone number ID" hint="Meta Business → WhatsApp → API setup">{inp('phoneNumberId')}</Field>
          <Field label="WhatsApp Business account ID">{inp('businessId')}</Field>
          <div className="md:col-span-2">
            <Field label="Permanent access token" hint={v.accessToken ? 'Saved. Leave it as it is to keep it, or paste a new token.' : 'System user token from Meta Business Settings (does not expire).'}>
              <div className="relative">
                <input className="admin-input pr-11" type={showTok ? 'text' : 'password'} autoComplete="off" value={v.accessToken ?? ''} onChange={(e) => set('accessToken', e.target.value)} />
                <button type="button" onClick={() => setShowTok(!showTok)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b8862f]" aria-label={showTok ? 'Hide token' : 'Show token'}>{showTok ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </Field>
          </div>
          <Field label="Webhook verify token (any text you choose)" hint="Use exactly this word in Meta.">{inp('verifyToken', 'e.g. gvu-2026')}</Field>
          <Field label="Webhook URL (paste in Meta)" hint="Subscribe to “messages”. Client replies then appear in their application.">
            <code className="block select-all break-all rounded-xl bg-[#fbf4df] px-3 py-2.5 text-[13px]">{site()}/api/whatsapp/webhook</code>
          </Field>
          <Field label="App secret" hint="Meta app → Settings → Basic. Checks that incoming messages really come from Meta.">{inp('appSecret', '', true)}</Field>
          <div className="md:col-span-2">
            <Field label="Company numbers for alerts (enquiries, applications, payments)" hint="One per line, with country code">
              <textarea className="admin-input min-h-[60px]" value={v.teamNumbers} onChange={(e) => set('teamNumbers', e.target.value)} placeholder="+9715…" />
            </Field>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 ring-[#f0e7d2] md:col-span-2">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-[#b8862f]" checked={!!v.copyTeam} onChange={(e) => set('copyTeam', e.target.checked)} />
            <span><b className="block text-sm text-gray-900">Copy client messages to team numbers</b><span className="text-xs text-gray-500">The team numbers above also receive every update sent to a client (welcome, status, quote, payment), exactly as the client sees it.</span></span>
          </label>
          <fieldset className="space-y-3 rounded-2xl p-4 ring-1 ring-[#f0e7d2] md:col-span-2">
            <legend className="px-1 text-xs font-extrabold uppercase tracking-[0.12em] text-[#8a6a14]">☆ Google review request</legend>
            <Field label="Your Google review link" hint="Google Business Profile → Ask for reviews → copy the link.">{inp('reviewLink', 'https://g.page/r/…/review')}</Field>
            <Field label="Review message" hint="The link is added at the end.">
              <textarea className="admin-input min-h-[60px]" value={v.reviewText ?? ''} onChange={(e) => set('reviewText', e.target.value)} placeholder="Thank you for choosing us! Your file is complete. Could you spare a minute to leave us a Google review?" />
            </Field>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-[#f0e7d2]">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[#b8862f]" checked={!!v.reviewAsk} onChange={(e) => set('reviewAsk', e.target.checked)} />
              <span><b className="block text-sm text-gray-900">Ask for a review when a file reaches its last step</b><span className="text-xs text-gray-500">Sent once per file on WhatsApp and email. The team can also send it from the file page.</span></span>
            </label>
          </fieldset>
          <Field label="Template language code" hint="For approved templates, e.g. en, ar">{inp('templateLang', 'en')}</Field>
        </div>
      </Card>
      )}
      {show('auto') && (
      <div className="space-y-3">
        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Step messages, one for every step of every service</h3>
              <p className="text-sm text-gray-500">When a file moves to a new step, the client gets that step’s own text. Edit them per service on Application steps.</p>
            </div>
            <a href="/admin/steps" className="rounded-xl bg-gradient-to-b from-[#e8c766] to-[#b8862f] px-4 py-2 text-sm font-bold text-white">Edit step messages</a>
          </div>
        </Card>
        <p className="text-xs text-gray-500">
          Each message below goes out automatically. Inside 24 hours after a client wrote to you, this text is sent. Outside that window Meta only delivers approved templates: the template name is filled in by “Create all templates in Meta” on the Setup tab. Names ending in <b>_file</b> or with <b>_pdf_</b> carry the PDF (quote or receipt); names ending in <b>_btn_v1</b> have an “Open my file” button.
        </p>
        {EVENTS.map((e) => (
          <Card key={e.key} className="p-0">
            <div className="space-y-3 p-4">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-[#f0e7d2]">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[#b8862f]" checked={v.autos?.[e.key] !== false} onChange={(x) => set('autos', { ...v.autos, [e.key]: x.target.checked })} />
                <span><b className="block text-sm text-gray-900">{e.label}</b><span className="text-xs text-gray-500">Variables: {e.vars}</span></span>
              </label>
              <Field label="Message text">
                <WaBox value={v.waTexts?.[e.key] ?? mail?.events?.[e.key]?.body ?? ''} onChange={(x) => set('waTexts', { ...(v.waTexts || {}), [e.key]: x })} preview />
              </Field>
              <p className="text-xs text-gray-400">Bold, italic, lists and emojis show on WhatsApp. A new line starts a new line. WhatsApp has no colours.</p>
              <div className="max-w-md">
                <Field label="Approved template name (optional)">
                  <input className="admin-input" placeholder="template name" value={v.templates?.[e.key] || ''} onChange={(x) => set('templates', { ...v.templates, [e.key]: x.target.value.trim() })} />
                </Field>
              </div>
            </div>
          </Card>
        ))}
      </div>
      )}
      {(show('setup') || show('auto')) && <SaveBar save={saveWa} saving={saving} />}
      {show('test') && (
      <Card title="Send a test" className="p-0">
        <div className="flex flex-wrap items-end gap-3 p-5">
          <Field label="Send to (with country code)">
            <input className="admin-input" value={to} onChange={(e) => setTo(e.target.value)} placeholder="+9715…" />
          </Field>
          <div className="w-full">
            <Field label="Message">
              <textarea className="admin-input min-h-[70px]" value={testText} onChange={(e) => setTestText(e.target.value)} placeholder="Test message from your website: WhatsApp is connected ✅" />
            </Field>
          </div>
          <div className="w-full space-y-1.5 text-sm text-gray-700">
            <label className="flex items-center gap-2"><input type="radio" className="accent-[#b8862f]" checked={testMode === 'template'} onChange={() => setTestMode('template')} /> Approved template (works any time, like real client updates)</label>
            <label className="flex items-center gap-2"><input type="radio" className="accent-[#b8862f]" checked={testMode === 'plain'} onChange={() => setTestMode('plain')} /> Plain text (only if they wrote to you in the last 24 h)</label>
          </div>
          <Btn variant="dark" loading={testing} onClick={test}>
            <Send className="h-4 w-4" /> Send test
          </Btn>
          <p className="w-full text-xs text-gray-400">Save first. Plain text to a number that has not written to you in the last 24 hours sends Meta's “hello_world” template instead.</p>
        </div>
      </Card>
      )}
    </div>
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
function WaChecklist({ v, reload }: { v: any; reload: () => void }) {
  const filled = Object.values(v.templates || {}).filter(Boolean).length;
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const hook = `${site()}/api/whatsapp/webhook`;
  const run = async (action: 'check' | 'register' | 'subscribe' | 'create' | 'sync') => {
    setBusy(action);
    try {
      const r = action === 'create' || action === 'sync'
        ? await api<{ result: { ok: boolean; msg: string } }>('/api/admin/client-system/templates', 'POST', { action }).then((x) => ({ ok: x.result.ok, msg: x.result.msg }))
        : await api<{ ok: boolean; msg: string }>('/api/admin/client-system/wa', 'POST', { action, pin });
      setMsg({ ok: r.ok, text: r.msg });
      toast(r.ok ? 'Done' : 'See the message below', r.ok ? 'success' : 'error');
      if (action === 'sync') reload();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  };
  const gold = 'rounded-xl bg-gradient-to-b from-[#e8c766] to-[#b8862f] px-3.5 py-2 text-sm font-bold text-white shadow-sm disabled:opacity-60';
  const plain = 'rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-gray-800 ring-1 ring-[#eadfc4] hover:bg-[#fbf6ea]';
  const items: { ok: boolean; label: string; act?: React.ReactNode }[] = [
    {
      ok: !!(v.phoneNumberId && v.businessId),
      label: 'Phone number ID and Business account ID',
      act: (
        <>
          <button type="button" className={gold} disabled={!!busy} onClick={() => run('check')}>{busy === 'check' ? 'Checking…' : 'Check connection'}</button>
          <span className="inline-flex flex-col gap-1.5">
            <input className="admin-input !w-[110px]" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="6-digit PIN" aria-label="6-digit PIN" />
            <button type="button" className={plain} disabled={!!busy} onClick={() => run('register')}>Register number</button>
          </span>
          <a className={plain} href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">Open my Meta apps ↗</a>
        </>
      ),
    },
    { ok: !!v.accessToken, label: 'Permanent access token', act: <a className={plain} href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer">Open System users ↗</a> },
    { ok: v.mode === 'cloud', label: 'Mode set to “Cloud API”' },
    {
      ok: !!(v.appSecret && v.verifyToken),
      label: `Webhook connected · incoming messages${v.appSecret && v.verifyToken ? ' ✓' : ''}`,
      act: (
        <>
          <button type="button" className={gold} disabled={!!busy} onClick={() => run('subscribe')}>Connect incoming messages</button>
          <button type="button" className={plain} onClick={() => { navigator.clipboard?.writeText(hook); toast('Webhook URL copied'); }}>Copy webhook URL</button>
          <a className={plain} href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer">Open my Meta apps ↗</a>
        </>
      ),
    },
    {
      ok: filled >= EVENTS.length - 1,
      label: `Approved message templates (${filled} of ${EVENTS.length} filled in)`,
      act: (
        <>
          <button type="button" className={gold} disabled={!!busy} onClick={() => run('create')}>{busy === 'create' ? 'Creating…' : 'Create all templates in Meta'}</button>
          <button type="button" className={plain} disabled={!!busy} onClick={() => run('sync')}>Check approval</button>
          <a className={plain} href="https://business.facebook.com/wa/manage/message-templates/" target="_blank" rel="noopener noreferrer">Open templates in Meta ↗</a>
        </>
      ),
    },
  ];
  const done = items.filter((x) => x.ok).length;
  return (
    <Card title="Setup checklist" actions={<Pill on={done === items.length}>{done} of {items.length} done</Pill>} className="p-0">
      <ul className="space-y-4 p-5">
        {items.map((x) => (
          <li key={x.label} className="flex items-start gap-3">
            <span className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold', x.ok ? 'bg-gradient-to-b from-[#e8c766] to-[#b8862f] text-white' : 'bg-gray-100 text-gray-400')}>{x.ok ? '✓' : ''}</span>
            <div className="min-w-0 flex-1">
              <b className="text-[15px] text-gray-900">{x.label}</b>
              {x.act && <div className="mt-2 flex flex-wrap items-start gap-2">{x.act}</div>}
            </div>
          </li>
        ))}
      </ul>
      {msg && <p className={cn('mx-5 mb-4 rounded-xl p-3 text-sm', msg.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>{msg.text}</p>}
      <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
        When all steps are done, open “Send a test” and send to your own number. Also make sure the number is registered (display name approved) and a payment method is added:{' '}
        <a className="underline" href="https://business.facebook.com/wa/manage/phone-numbers/" target="_blank" rel="noopener noreferrer">phone numbers ↗</a> ·{' '}
        <a className="underline" href="https://business.facebook.com/billing_hub/" target="_blank" rel="noopener noreferrer">payment settings ↗</a>
      </p>
    </Card>
  );
}

/** Email or WhatsApp message log (latest 150). */
function MessageLog({ channel }: { channel: 'whatsapp' | 'email' }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { api<any>(`/api/admin/client-system/overview?what=log&channel=${channel}`).then((r) => setRows(r.rows)).catch(() => setRows([])); }, [channel]);
  return (
    <Card
      title={channel === 'email' ? 'Email log' : 'Message log'}
      actions={
        rows && rows.length > 0 ? (
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-100 hover:bg-red-50"
            onClick={async () => {
              if (!window.confirm('Clear the whole log?')) return;
              try { await api(`/api/admin/client-system/overview?channel=${channel}`, 'DELETE'); setRows([]); toast('Log cleared'); } catch (e: any) { toast(e.message, 'error'); }
            }}
          >
            Clear the log
          </button>
        ) : undefined
      }
      className="p-0"
    >
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
            <thead><tr className="text-left text-[0.68rem] font-extrabold uppercase tracking-wider text-gray-400"><th className="px-5 py-2">Date</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">File</th><th className="px-3 py-2">Description</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Method</th><th className="px-3 py-2" /></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {d.rows.map((r: any) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-5 py-2 text-xs text-gray-500">{fmtWhen(r.at)}</td>
                  <td className="px-3 py-2">{r.client}</td>
                  <td className="px-3 py-2"><a className="font-mono text-xs font-bold hover:underline" href={`/admin/applications/${r.appId}`}>{r.ref}</a></td>
                  <td className="px-3 py-2 text-gray-600">{r.label}{r.receiptNo ? <span className="block text-xs text-gray-400">Receipt {r.receiptNo}</span> : null}</td>
                  <td className="px-3 py-2 text-right font-semibold">{fmtAed(r.amount)}</td>
                  <td className="px-3 py-2"><span className={cn('rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold', r.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : r.status === 'checkout' ? 'bg-[#fbf0cf] text-[#8a6a14]' : 'bg-red-50 text-red-700')}>{r.status === 'paid' ? 'Paid' : r.status === 'checkout' ? 'Checkout opened' : 'Due'}</span></td>
                  <td className="px-3 py-2 text-xs text-gray-500">{r.method || '—'}{r.txn ? <small className="block text-gray-400">{String(r.txn).slice(0, 26)}</small> : null}</td>
                  <td className="px-3 py-2">{r.receipt && <a className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold ring-1 ring-gray-200" href={r.receipt} target="_blank" rel="noopener noreferrer">Receipt</a>}</td>
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
        <Field label="Quote label (top right)">
          <input className="admin-input" value={v.quoteLabel ?? ''} onChange={(e) => set('quoteLabel', e.target.value)} placeholder="QUOTATION" />
        </Field>
        <Field label="Receipt label (top right)">
          <input className="admin-input" value={v.receiptLabel ?? ''} onChange={(e) => set('receiptLabel', e.target.value)} placeholder="PAYMENT RECEIPT" />
        </Field>
        <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
          <Toggle checked={v.showLogo !== false} onChange={(x) => set('showLogo', x)} label="Show the logo" />
          <Toggle checked={v.showDate !== false} onChange={(x) => set('showDate', x)} label="Show the date" />
          <Toggle checked={v.pageNumbers !== false} onChange={(x) => set('pageNumbers', x)} label="Page numbers (when more than one page)" />
          <Toggle checked={!!v.showCompany} onChange={(x) => set('showCompany', x)} label="Show the company block" />
        </div>
        {v.showCompany && (
          <div className="md:col-span-2">
            <Field label="Company block at the bottom (one line each; empty: from Site settings)">
              <textarea className="admin-input min-h-[80px]" value={v.company ?? ''} onChange={(e) => set('company', e.target.value)} />
            </Field>
          </div>
        )}
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <a className="rounded-xl bg-white px-4 py-2 text-sm font-bold ring-1 ring-gray-200" href="/api/admin/client-system/preview?kind=quote" target="_blank" rel="noopener noreferrer">Preview quote ↗</a>
          <a className="rounded-xl bg-white px-4 py-2 text-sm font-bold ring-1 ring-gray-200" href="/api/admin/client-system/preview?kind=receipt" target="_blank" rel="noopener noreferrer">Preview receipt ↗</a>
          <a className="rounded-xl bg-white px-4 py-2 text-sm font-bold ring-1 ring-gray-200" href="/api/admin/client-system/preview?kind=email" target="_blank" rel="noopener noreferrer">Preview email ↗</a>
          <span className="self-center text-xs text-gray-400">Save first: the preview uses the saved settings.</span>
        </div>
        <div className="md:col-span-2">
          <SaveBar save={() => save()} saving={saving} />
        </div>
      </div>
    </Card>
  );
}

/** WhatsApp style text box: *bold*, _italic_, ~strike~, emoji, and a preview of the message. */
function WaBox({ value, onChange, placeholder, preview }: { value: string; onChange: (v: string) => void; placeholder?: string; preview?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [emo, setEmo] = useState(false);
  const focus = (x: number, y: number) => setTimeout(() => { ref.current?.focus(); ref.current?.setSelectionRange(x, y); }, 0);
  const wrap = (a: string, z = a) => {
    const t = ref.current;
    if (!t) return;
    const [x, y] = [t.selectionStart, t.selectionEnd];
    const sel = value.slice(x, y) || 'text';
    onChange(value.slice(0, x) + a + sel + z + value.slice(y));
    focus(x + a.length, x + a.length + sel.length);
  };
  const lead = (p: string) => {
    const t = ref.current;
    const x = t ? t.selectionStart : value.length;
    const start = value.lastIndexOf('\n', x - 1) + 1;
    onChange(value.slice(0, start) + p + value.slice(start));
    focus(x + p.length, x + p.length);
  };
  const put = (e: string) => {
    const t = ref.current;
    const x = t ? t.selectionStart : value.length;
    onChange(value.slice(0, x) + e + value.slice(x));
    focus(x + e.length, x + e.length);
  };
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = esc(value)
    .replace(/```([\s\S]+?)```/g, '<code>$1</code>')
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<b>$2</b>').replace(/(^|[\s(])_([^_\n]+)_/g, '$1<i>$2</i>').replace(/(^|[\s(])~([^~\n]+)~/g, '$1<s>$2</s>')
    .replace(/^&gt; ?(.*)$/gm, '<span style="display:block;border-left:3px solid #d1d5db;padding-left:8px;color:#4b5563">$1</span>')
    .replace(/\{(\w+)\}/g, '<span style="background:#fbecc0;border-radius:4px;padding:0 4px">{$1}</span>')
    .replace(/&lt;br&gt;/g, '<br>')
    .replace(/\n/g, '<br>');
  const tb = 'grid h-8 min-w-8 place-items-center rounded-lg bg-white px-2 text-sm ring-1 ring-gray-200 hover:bg-[#fbf6ea]';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => wrap('*')} className={cn(tb, 'font-extrabold')} title="Bold">B</button>
        <button type="button" onClick={() => wrap('_')} className={cn(tb, 'italic')} title="Italic">I</button>
        <button type="button" onClick={() => wrap('~')} className={cn(tb, 'line-through')} title="Strike">S</button>
        <button type="button" onClick={() => wrap('```')} className={cn(tb, 'font-mono text-xs')} title="Monospace">{'</>'}</button>
        <button type="button" onClick={() => lead('> ')} className={tb} title="Quote">❝</button>
        <button type="button" onClick={() => lead('• ')} className={tb} title="List">•</button>
        <button type="button" onClick={() => put('\n')} className={tb} title="New line">↵</button>
        <span className="relative">
          <button type="button" onClick={() => setEmo(!emo)} className={tb} title="Emoji">🙂</button>
          {emo && (
            <span className="absolute left-0 top-9 z-10 grid w-56 grid-cols-8 gap-1 rounded-xl bg-white p-2 shadow-lg ring-1 ring-gray-200">
              {['✅', '📄', '💳', '📅', '🎉', '⏳', '📎', '🙏', '👋', '⭐', '📌', '🔔', '🏛️', '🇦🇪', '💬', '📞'].map((e) => (
                <button key={e} type="button" onClick={() => { put(e); setEmo(false); }} className="rounded p-0.5 hover:bg-gray-100">{e}</button>
              ))}
            </span>
          )}
        </span>
      </div>
      <textarea ref={ref} rows={4} className="admin-input resize-y" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {(preview || value.trim()) && (
        <div className="rounded-xl bg-[#ece5dd] p-3">
          <p className="mb-2 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-gray-500">WhatsApp preview</p>
          <div className="max-w-[90%] rounded-lg rounded-tl-none bg-white px-3 py-2 text-[13px] leading-snug text-gray-800 shadow-sm" dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} />
        </div>
      )}
    </div>
  );
}

/** Application steps (the Abu Dhabi Golden Visa layout): per service list, numbered steps with sections,
 *  the WhatsApp message of each step, how many open files are on it, move / add / remove, restore. */
function StepsTab() {
  const { value: v, setValue, save, saving } = useSetting<any>('steps');
  const [which, setWhich] = useState<string>('Golden Visa');
  const [counts, setCounts] = useState<any>(null);
  useEffect(() => { api<any>('/api/admin/client-system/step-counts').then(setCounts).catch(() => null); }, []);
  if (!v) return <Spinner />;
  const own = v.groups?.[which];
  const list: any[] = (which === 'Golden Visa' ? v.golden : Array.isArray(own) && own.length ? own : v.other) || [];
  const shared = which !== 'Golden Visa' && !(Array.isArray(own) && own.length);
  const per: Record<string, number> = counts?.[which]?.perStep || {};
  const setList = (l: any[]) => setValue(which === 'Golden Visa' ? { ...v, golden: l } : { ...v, groups: { ...(v.groups || {}), [which]: l } });
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
  const label = which;
  const KEEP = ['quote-sent', 'quote-ok', 'pay-wait', 'paid', 'approved'];
  return (
    <div className="space-y-5">
      <h2 className="font-display text-2xl font-semibold text-gray-900">The steps your clients <span className="text-[#b8862f]">see and follow.</span></h2>
      <nav className="flex flex-wrap gap-2" aria-label="Service">
        {STEP_SERVICES.map((k) => (
          <button key={k} type="button" onClick={() => setWhich(k)} className={cn('inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ring-1', which === k ? 'bg-[#1a1406] text-[#f2d27a] ring-transparent' : 'bg-white text-gray-800 ring-[#eadfc4] hover:bg-[#fbf6ea]')}>
            {k}
            {counts?.[k]?.files ? <em className="grid h-5 min-w-5 place-items-center rounded-full bg-[#e8c766] px-1.5 text-[0.65rem] not-italic text-[#1a1406]">{counts[k].files}</em> : null}
          </button>
        ))}
      </nav>
      <Card className="p-0">
        <div className="space-y-4 p-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{label} <small className="font-normal text-gray-400">· {list.length} steps</small></h3>
            {shared && <p className="mt-1 rounded-lg bg-[#fdf8ea] px-3 py-2 text-xs text-[#6b5a35]">This service group uses the standard list for other services. Change anything and press Save to give {label} its own steps, or restore its standard steps below.</p>}
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
                  setList((which === 'Golden Visa' ? GOLDEN_STEPS : (SERVICE_STEPS0 as Record<string, any[]>)[which] || OTHER_STEPS).map((x: any) => ({ ...x })));
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
