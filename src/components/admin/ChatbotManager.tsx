'use client';
import { useCallback, useEffect, useState } from 'react';
import { Bot, FlaskConical, MessageSquare, RefreshCw, Save, Search, Trash2 } from 'lucide-react';
import { Btn, Card, Empty, Modal, PageTitle, Spinner, Toggle, api, confirmDialog, toast } from './ui';
import { cn } from '@/lib/utils';

const LANGS: [string, string][] = [
  ['en', 'English'],
  ['ar', 'Arabic'],
  ['ru', 'Russian'],
  ['tr', 'Turkish'],
  ['zh', 'Chinese'],
  ['fr', 'French'],
  ['de', 'German'],
  ['es', 'Spanish'],
  ['ro', 'Romanian'],
  ['hi', 'Hindi'],
];
const REASON: Record<string, string> = { apply: 'Wants to apply', quote: 'Personal quote', unknown: 'Could not answer', human: 'Asked for a human' };

export default function ChatbotManager({ openChat }: { openChat?: string }) {
  const [tab, setTab] = useState<'chats' | 'settings'>('chats');
  const [cfg, setCfg] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (withCfg = false) => {
    const d = await api<any>('/api/admin/chatbot');
    setStats(d.stats);
    setProviders(d.providers);
    if (withCfg) setCfg(d.config);
  }, []);
  useEffect(() => {
    load(true).catch((e) => toast(e.message, 'error'));
  }, [load]);

  const patch = (fn: (c: any) => void) => {
    setCfg((c: any) => {
      const n = structuredClone(c);
      fn(n);
      return n;
    });
    setDirty(true);
  };

  async function save(next = cfg) {
    setSaving(true);
    try {
      const d = await api<any>('/api/admin/chatbot', 'PUT', { config: next });
      setCfg(d.config);
      setStats(d.stats);
      setDirty(false);
      toast('Chatbot settings saved');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!cfg || !stats) return <Spinner />;
  return (
    <div className="space-y-6">
      <PageTitle
        title="AI chatbot"
        subtitle="Answers visitors from your own content (services, prices, FAQs, articles), never promises approval, and hands over to WhatsApp with a summary. Every chat is saved and becomes a lead when there is something to follow up."
        actions={
          dirty && (
            <Btn onClick={() => save()} loading={saving}>
              <Save className="h-4 w-4" /> Save changes
            </Btn>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1">
          <div className="space-y-3 p-5">
            <Toggle checked={!!cfg.enabled} onChange={(v) => save({ ...cfg, enabled: v })} label={cfg.enabled ? 'Chatbot ON' : 'Chatbot OFF'} />
            <p className="text-xs text-gray-500">{cfg.enabled ? 'Shown on every page, loaded after the page is ready.' : 'Off: nothing is loaded on the website.'}</p>
          </div>
        </Card>
        {[
          ['Chats today', stats.today.chats, `${stats.week.chats} in 7 days`],
          ['Sent to WhatsApp', stats.today.handed, `${stats.week.handed} in 7 days`],
          ['Left contact details', stats.today.withContact, `${stats.week.withContact} in 7 days · AI replies today ${stats.repliesToday}/${cfg.maxRepliesPerDay || '∞'}`],
        ].map(([l, n, sub]) => (
          <Card key={l as string}>
            <div className="p-5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-gray-400">{l}</p>
              <p className="mt-1 text-3xl font-extrabold tabular-nums">{n}</p>
              <p className="mt-1 text-xs text-gray-500">{sub}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        {(
          [
            ['chats', 'Chats', MessageSquare],
            ['settings', 'Settings', Bot],
          ] as const
        ).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={cn('inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold', tab === id ? 'bg-ink text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200')}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'chats' ? <Chats openChat={openChat} reasons={stats.reasons} /> : <Settings cfg={cfg} patch={patch} providers={providers} />}
    </div>
  );
}

function Chats({ openChat, reasons }: { openChat?: string; reasons: Record<string, number> }) {
  const [range, setRange] = useState('today');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [items, setItems] = useState<any[] | null>(null);
  const [view, setView] = useState<any>(null);
  const load = useCallback(() => api<any>(`/api/admin/chatbot/chats?range=${range}&status=${status}&q=${encodeURIComponent(q)}`).then((d) => setItems(d.items)).catch((e) => toast(e.message, 'error')), [range, status, q]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  const openOne = useCallback((id: string) => api<any>(`/api/admin/chatbot/chats?id=${id}`).then((d) => setView(d.chat)).catch((e) => toast(e.message, 'error')), []);
  useEffect(() => {
    if (openChat) openOne(openChat);
  }, [openChat, openOne]);

  return (
    <>
      <Card
        title="Chats"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input className="admin-input !w-52 !py-1.5 !pl-8 text-xs" placeholder="Search text, name, phone" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="admin-input !w-auto !py-1.5 text-xs" value={range} onChange={(e) => setRange(e.target.value)}>
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="all">All</option>
            </select>
            <select className="admin-input !w-auto !py-1.5 text-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All chats</option>
              <option value="handed">Sent to WhatsApp</option>
              <option value="open">Answered by the bot</option>
            </select>
            <Btn size="sm" variant="ghost" onClick={load}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Btn>
          </div>
        }
      >
        {Object.keys(reasons).length > 0 && (
          <p className="border-b border-gray-100 px-5 py-2.5 text-xs text-gray-500">
            WhatsApp hand-overs (7 days): {Object.entries(reasons).map(([k, n]) => `${REASON[k] || k} ${n}`).join(' · ')}
          </p>
        )}
        {!items ? (
          <Spinner />
        ) : !items.length ? (
          <Empty text="No chats for this filter." />
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((c) => (
              <button key={c.id} onClick={() => openOne(c.id)} className="flex w-full flex-wrap items-center gap-4 px-5 py-3 text-left hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {c.name || 'Visitor'} {c.phone && <span className="font-mono text-xs text-gray-500">{c.phone}</span>} {c.email && <span className="text-xs text-gray-500">{c.email}</span>}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {c.summary || '—'} · {c.count} messages · {c.locale.toUpperCase()} · {c.page}
                  </p>
                </div>
                {c.status === 'handed' ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.68rem] font-bold text-emerald-700">WhatsApp · {REASON[c.handover] || c.handover}</span> : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[0.68rem] font-bold text-gray-500">bot only</span>}
                {c.leadId && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[0.68rem] font-bold text-sky-700">lead</span>}
                <span className="text-xs text-gray-400">{new Date(c.updatedAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        )}
      </Card>
      <Modal
        open={!!view}
        onClose={() => setView(null)}
        wide
        title={view ? `${view.name || 'Visitor'} · ${new Date(view.createdAt).toLocaleString()}` : ''}
        footer={
          view && (
            <>
              {view.leadId && (
                <a href="/admin/leads" className="mr-auto text-sm font-bold text-gold-deep underline">
                  Open in Leads
                </a>
              )}
              <Btn variant="danger" size="sm" onClick={() => confirmDialog('Delete this chat?') && api(`/api/admin/chatbot/chats?id=${view.id}`, 'DELETE').then(() => (setView(null), load()))}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Btn>
            </>
          )
        }
      >
        {view && (
          <div className="space-y-3 text-sm">
            <p className="text-xs text-gray-500">
              Page {view.page} · {view.locale.toUpperCase()} {view.phone && `· ${view.phone}`} {view.email && `· ${view.email}`} {view.status === 'handed' && `· sent to WhatsApp (${REASON[view.handover] || view.handover})`}
            </p>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto rounded-xl bg-gray-50 p-4">
              {view.messages.map((m: any, i: number) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                  <p className={cn('max-w-[80%] whitespace-pre-line rounded-2xl px-3 py-2', m.role === 'user' ? 'bg-ink text-white' : 'bg-white ring-1 ring-gray-200')}>{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Settings({ cfg, patch, providers }: { cfg: any; patch: (fn: (c: any) => void) => void; providers: any[] }) {
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function runTest() {
    setBusy(true);
    setTest(null);
    try {
      const d = await api<any>('/api/admin/chatbot', 'POST', {});
      setTest({ ok: true, text: `${d.answer} (${d.ms} ms)` });
    } catch (e: any) {
      setTest({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }
  const p = providers.find((x) => x.id === cfg.provider);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="AI">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="admin-label">Provider</label>
            <select className="admin-input" value={cfg.provider} onChange={(e) => patch((c) => (c.provider = e.target.value))}>
              {providers.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label">Model</label>
            <input className="admin-input font-mono" value={cfg.model} onChange={(e) => patch((c) => (c.model = e.target.value))} />
            <p className="mt-1 text-xs text-gray-500">A fast, low-cost model is best for chat.</p>
          </div>
          <div className="sm:col-span-2">
            <label className="admin-label">API key (optional)</label>
            <input type="password" autoComplete="off" className="admin-input font-mono" placeholder={`${p?.keyHint || ''} — empty = use the key from Auto Publisher / server`} value={cfg.key} onChange={(e) => patch((c) => (c.key = e.target.value))} />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Btn size="sm" variant="dark" onClick={runTest} loading={busy}>
              <FlaskConical className="h-3.5 w-3.5" /> Test
            </Btn>
            <span className="text-xs text-gray-500">Save first.</span>
          </div>
          {test && <p className={cn('rounded-lg p-3 text-xs sm:col-span-2', test.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>{test.text}</p>}
          <div>
            <label className="admin-label">Max AI replies per day</label>
            <input type="number" className="admin-input" value={cfg.maxRepliesPerDay} onChange={(e) => patch((c) => (c.maxRepliesPerDay = Number(e.target.value)))} />
            <p className="mt-1 text-xs text-gray-500">After this, visitors are sent straight to WhatsApp. 0 = no limit.</p>
          </div>
          <div>
            <label className="admin-label">Max messages per chat</label>
            <input type="number" className="admin-input" value={cfg.maxMessagesPerChat} onChange={(e) => patch((c) => (c.maxMessagesPerChat = Number(e.target.value)))} />
          </div>
          <div>
            <label className="admin-label">Delete chats after (days)</label>
            <input type="number" className="admin-input" value={cfg.deleteAfterDays} onChange={(e) => patch((c) => (c.deleteAfterDays = Number(e.target.value)))} />
            <p className="mt-1 text-xs text-gray-500">0 = keep forever. Leads are kept.</p>
          </div>
        </div>
      </Card>

      <Card title="Look & hand-over">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="admin-label">Bot name</label>
            <input className="admin-input" value={cfg.botName} onChange={(e) => patch((c) => (c.botName = e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Colour</label>
              <input type="color" className="h-10 w-full cursor-pointer rounded-xl border border-gray-200" value={cfg.color} onChange={(e) => patch((c) => (c.color = e.target.value))} />
            </div>
            <div>
              <label className="admin-label">Position</label>
              <select className="admin-input" value={cfg.position} onChange={(e) => patch((c) => (c.position = e.target.value))}>
                <option value="end">Right (above WhatsApp)</option>
                <option value="start">Left</option>
              </select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="admin-label">WhatsApp number for hand-over</label>
            <input className="admin-input font-mono" placeholder="Empty = the site's WhatsApp number" value={cfg.whatsapp} onChange={(e) => patch((c) => (c.whatsapp = e.target.value))} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <p className="admin-label">Send the visitor to WhatsApp (with a summary) when they…</p>
            <Toggle checked={cfg.handover.apply} onChange={(v) => patch((c) => (c.handover.apply = v))} label="want to apply" />
            <Toggle checked={cfg.handover.quote} onChange={(v) => patch((c) => (c.handover.quote = v))} label="want a personal quote" />
            <Toggle checked={cfg.handover.unknown} onChange={(v) => patch((c) => (c.handover.unknown = v))} label="ask something the bot cannot answer" />
            <Toggle checked={cfg.handover.human} onChange={(v) => patch((c) => (c.handover.human = v))} label="ask for a human" />
            <Toggle checked={cfg.handover.askContact} onChange={(v) => patch((c) => (c.handover.askContact = v))} label="first ask once for name and WhatsApp number" />
          </div>
          <div className="sm:col-span-2">
            <label className="admin-label">Extra rules for the bot (one per line)</label>
            <textarea rows={3} className="admin-input" placeholder="e.g. Always mention our office hours when someone asks to visit." value={cfg.extraRules} onChange={(e) => patch((c) => (c.extraRules = e.target.value))} />
            <p className="mt-1 text-xs text-gray-500">The bot also uses Company knowledge from Auto Publisher, your services, cost-calculator prices, FAQs and articles.</p>
          </div>
        </div>
      </Card>

      <Card title="Greeting per language" className="xl:col-span-2">
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {LANGS.map(([code, name]) => (
            <div key={code}>
              <label className="admin-label">{name}</label>
              <textarea rows={2} dir={code === 'ar' ? 'rtl' : 'ltr'} className="admin-input" value={cfg.greetings?.[code] || ''} onChange={(e) => patch((c) => (c.greetings = { ...c.greetings, [code]: e.target.value }))} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
