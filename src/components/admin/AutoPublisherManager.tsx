'use client';
import { useCallback, useEffect, useState } from 'react';
import { Activity, BookOpen, Images, CirclePause, CirclePlay, ClipboardCheck, FileWarning, FlaskConical, Gauge, ImageIcon, KeyRound, ListChecks, Power, RefreshCw, Save, ScrollText, Search, ShieldCheck, Sparkles, Target, Trash2, Undo2, Waypoints } from 'lucide-react';
import { Btn, Card, Empty, PageTitle, Spinner, Toggle, api, confirmDialog, toast } from './ui';
import { cn } from '@/lib/utils';
import { KeywordsTab, KnowledgeTab, LiveJobs, MissionsTab, ReportTab, ReviewTab } from './AutoPublisherPanels';
import PhotoLibraryTab from './PhotoLibrary';

type Tab = 'overview' | 'missions' | 'review' | 'keywords' | 'knowledge' | 'ai' | 'photos' | 'quality' | 'report' | 'copied' | 'logs';
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'missions', label: 'Missions', icon: Target },
  { id: 'review', label: 'Review queue', icon: ClipboardCheck },
  { id: 'keywords', label: 'Keywords', icon: Search },
  { id: 'knowledge', label: 'Company knowledge', icon: BookOpen },
  { id: 'ai', label: 'AI & pictures', icon: KeyRound },
  { id: 'photos', label: 'Photo library', icon: Images },
  { id: 'quality', label: 'Quality & SEO', icon: Gauge },
  { id: 'report', label: 'Similarity report', icon: Waypoints },
  { id: 'copied', label: 'Copied posts', icon: FileWarning },
  { id: 'logs', label: 'Logs', icon: ScrollText },
];

const STATE: Record<string, { label: string; tone: string; help: string }> = {
  off: { label: 'Off', tone: 'bg-gray-100 text-gray-700', help: 'The publisher is switched off. The website works exactly as before.' },
  no_key: { label: 'No API key', tone: 'bg-amber-50 text-amber-800', help: 'Add a key for the writer AI in "AI & pictures".' },
  paused: { label: 'Paused', tone: 'bg-amber-50 text-amber-800', help: 'Paused by an admin.' },
  backoff: { label: 'Waiting (rate limit)', tone: 'bg-amber-50 text-amber-800', help: 'The AI provider asked us to slow down. It continues automatically.' },
  budget: { label: 'Daily budget reached', tone: 'bg-amber-50 text-amber-800', help: 'The maximum AI calls for today were used. It continues tomorrow.' },
  ready: { label: 'Ready', tone: 'bg-emerald-50 text-emerald-700', help: 'Switched on and configured.' },
};

export default function AutoPublisherManager() {
  const [tab, setTab] = useState<Tab>('overview');
  const [cfg, setCfg] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async (withConfig = false) => {
    const d = await api<any>('/api/admin/autopublisher');
    setStatus(d.status);
    setProviders(d.providers);
    if (withConfig) setCfg(d.config);
  }, []);

  useEffect(() => {
    load(true).catch((e) => toast(e.message, 'error'));
    const t = setInterval(() => document.visibilityState === 'visible' && load(false).catch(() => null), 5000);
    return () => clearInterval(t);
  }, [load]);

  const patch = (fn: (c: any) => any) => {
    setCfg((c: any) => fn(structuredClone(c)));
    setDirty(true);
  };

  async function save(next = cfg) {
    setSaving(true);
    try {
      const d = await api<any>('/api/admin/autopublisher', 'PUT', { config: next });
      setCfg(d.config);
      setStatus(d.status);
      setDirty(false);
      toast('Auto Publisher settings saved');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function act(action: string, extra: any = {}) {
    try {
      const d = await api<any>('/api/admin/autopublisher', 'POST', { action, ...extra });
      if (d.config) setCfg(d.config);
      if (d.status) setStatus(d.status);
      return d;
    } catch (e: any) {
      toast(e.message, 'error');
      throw e;
    }
  }

  if (!cfg || !status) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Auto Publisher"
        subtitle="Researches what people search, writes original articles, checks quality and similarity, and publishes — all in the background, never slowing the website."
        actions={
          dirty && (
            <Btn onClick={() => save()} loading={saving}>
              <Save className="h-4 w-4" /> Save changes
            </Btn>
          )
        }
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition', tab === t.id ? 'bg-ink text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50')}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <Overview cfg={cfg} status={status} saving={saving} onToggle={(v) => save({ ...cfg, enabled: v })} act={act} />
          <LiveJobs enabled={!!cfg.enabled} />
        </>
      )}
      {tab === 'missions' && <MissionsTab />}
      {tab === 'review' && <ReviewTab />}
      {tab === 'keywords' && <KeywordsTab />}
      {tab === 'knowledge' && <KnowledgeTab cfg={cfg} patch={patch} />}
      {tab === 'report' && <ReportTab />}
      {tab === 'ai' && <AiTab cfg={cfg} patch={patch} providers={providers} act={act} />}
      {tab === 'photos' && <PhotoLibraryTab />}
      {tab === 'quality' && <QualityTab cfg={cfg} patch={patch} />}
      {tab === 'copied' && <CopiedTab />}
      {tab === 'logs' && <LogsTab />}
    </div>
  );
}

/* ------------------------------------------------------------------ overview */
function Overview({ cfg, status, saving, onToggle, act }: { cfg: any; status: any; saving: boolean; onToggle: (v: boolean) => void; act: (a: string, x?: any) => Promise<any> }) {
  const st = STATE[status.state] || STATE.off;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card title="Master switch" className="lg:col-span-1">
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <Toggle checked={!!cfg.enabled} onChange={onToggle} label={cfg.enabled ? 'Publisher ON' : 'Publisher OFF'} />
            {saving && <span className="text-xs text-gray-400">Saving…</span>}
          </div>
          <div className={cn('rounded-xl p-4 text-sm', st.tone)}>
            <p className="flex items-center gap-2 font-bold">
              <Power className="h-4 w-4" /> {st.label}
            </p>
            <p className="mt-1">{st.help}</p>
            {status.backoff && <p className="mt-1 text-xs">Until {new Date(status.backoff.until).toLocaleString()} — {status.backoff.reason}</p>}
            {status.pausedUntil && <p className="mt-1 text-xs">Until {new Date(status.pausedUntil).toLocaleString()}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {status.pausedUntil ? (
              <Btn variant="outline" size="sm" onClick={() => act('resume').then(() => toast('Resumed'))}>
                <CirclePlay className="h-4 w-4" /> Resume
              </Btn>
            ) : (
              <Btn variant="outline" size="sm" onClick={() => act('pause', { hours: 24 }).then(() => toast('Paused for 24 hours'))}>
                <CirclePause className="h-4 w-4" /> Pause 24 h
              </Btn>
            )}
          </div>
          {status.fakeAi && <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-800">Dry-run mode (AUTOPUBLISHER_FAKE_AI=1): no real AI calls, no cost.</p>}
        </div>
      </Card>

      <Card title="Activity" className="lg:col-span-2">
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          {(['today', 'week'] as const).map((k) => (
            <div key={k} className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200/70">
              <p className="text-xs font-extrabold uppercase tracking-wider text-gray-400">{k === 'today' ? 'Today' : 'Last 7 days'}</p>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                {[
                  ['Written', status.stats[k].written],
                  ['Published', status.stats[k].published],
                  ['Held', status.stats[k].held],
                  ['Failed', status.stats[k].failed],
                ].map(([l, n]) => (
                  <div key={l as string}>
                    <p className="text-xl font-extrabold tabular-nums">{n}</p>
                    <p className="text-[0.68rem] text-gray-500">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200/70 sm:col-span-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold">AI calls today</span>
              <span className="tabular-nums text-gray-600">
                {status.aiCallsToday} / {status.maxAiCallsPerDay || '∞'}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
              <div className="h-full rounded-full bg-gold" style={{ width: `${status.maxAiCallsPerDay ? Math.min(100, (status.aiCallsToday / status.maxAiCallsPerDay) * 100) : 0}%` }} />
            </div>
          </div>
        </div>
        <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
          {status.tickerDisabled ? 'The automatic ticker is disabled on this server (DISABLE_AUTOPUBLISHER=1) — use an external cron on /api/cron/autopublish.' : cfg.enabled ? `Next automatic step: within ${status.tickEveryMinutes} minutes.` : 'Switch the publisher on to let missions run automatically.'} Pictures, refreshing old posts and replacing copied posts arrive in Phase 3 — until then articles use the image you give in a custom title, or none.
        </p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ AI & pictures */
function AiTab({ cfg, patch, providers, act }: { cfg: any; patch: (fn: (c: any) => any) => void; providers: any[]; act: (a: string, x?: any) => Promise<any> }) {
  const [testing, setTesting] = useState('');
  const [result, setResult] = useState<Record<string, { ok: boolean; text: string }>>({});

  async function test(id: string) {
    setTesting(id);
    try {
      const d = await act('test', { provider: id });
      setResult((r) => ({ ...r, [id]: { ok: true, text: `${d.model} · ${d.ms} ms — ${d.answer}` } }));
    } catch (e: any) {
      setResult((r) => ({ ...r, [id]: { ok: false, text: e.message } }));
    } finally {
      setTesting('');
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="Writer & editor">
        <div className="space-y-5 p-5">
          <div>
            <label className="admin-label">Writer AI (research, brief, article)</label>
            <select className="admin-input" value={cfg.writer} onChange={(e) => patch((c) => ((c.writer = e.target.value), c))}>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="admin-label">Editor AI (second pass — a different provider gives a fresher edit)</label>
            <select className="admin-input" value={cfg.editor} onChange={(e) => patch((c) => ((c.editor = e.target.value), c))}>
              <option value="">Same as writer</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Toggle checked={!!cfg.useTranslationGeminiKey} onChange={(v) => patch((c) => ((c.useTranslationGeminiKey = v), c))} label="Use the Gemini key from Languages when no Gemini key is set here" />
          <p className="text-xs text-gray-500">Keys are stored on your server, shown masked, and never written to logs. Save first, then press Test.</p>
        </div>
      </Card>

      <Card title="Providers">
        <div className="divide-y divide-gray-100">
          {providers.map((p) => (
            <div key={p.id} className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <p className="font-bold">{p.name}</p>
                <Btn size="sm" variant="dark" onClick={() => test(p.id)} loading={testing === p.id}>
                  <FlaskConical className="h-3.5 w-3.5" /> Test
                </Btn>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="admin-label">API key</label>
                  <input type="password" autoComplete="off" className="admin-input font-mono" placeholder={p.keyHint} value={cfg.providers[p.id]?.key || ''} onFocus={(e) => e.target.select()} onChange={(e) => patch((c) => ((c.providers[p.id].key = e.target.value), c))} />
                  <a href={p.keyUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-bold text-gold-deep underline">
                    Get a key
                  </a>
                  {keyWarning(p.id, cfg.providers[p.id]?.key || '') && <p className="mt-1 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{keyWarning(p.id, cfg.providers[p.id]?.key || '')}</p>}
                </div>
                <div>
                  <label className="admin-label">Model</label>
                  <input className="admin-input font-mono" value={cfg.providers[p.id]?.model || ''} onChange={(e) => patch((c) => ((c.providers[p.id].model = e.target.value), c))} />
                </div>
              </div>
              {result[p.id] && <p className={cn('break-words rounded-lg p-3 text-xs', result[p.id].ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>{result[p.id].text}</p>}
            </div>
          ))}
        </div>
      </Card>

      <Card title={<span className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Pictures</span>} className="xl:col-span-2">
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <div>
            <label className="admin-label">Picture provider</label>
            <select className="admin-input" value={cfg.images.provider} onChange={(e) => patch((c) => ((c.images.provider = e.target.value), c))}>
              <option value="openai">OpenAI images (uses the OpenAI key)</option>
              <option value="gemini">Google Gemini images (uses the Gemini key)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">OpenAI image model</label>
              <input className="admin-input font-mono" value={cfg.images.openaiModel} onChange={(e) => patch((c) => ((c.images.openaiModel = e.target.value), c))} />
            </div>
            <div>
              <label className="admin-label">Gemini image model</label>
              <input className="admin-input font-mono" value={cfg.images.geminiModel} onChange={(e) => patch((c) => ((c.images.geminiModel = e.target.value), c))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Quality</label>
              <select className="admin-input" value={cfg.images.quality} onChange={(e) => patch((c) => ((c.images.quality = e.target.value), c))}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="admin-label">Inline pictures per article</label>
              <input type="number" min={0} max={6} className="admin-input" value={cfg.images.inline} onChange={(e) => patch((c) => ((c.images.inline = Number(e.target.value)), c))} />
            </div>
          </div>
          <div>
            <label className="admin-label">If a picture fails the quality checks</label>
            <p className="rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">The AI fixes it itself: a cover gets up to 8 attempts with new scenes (the best clean one is used if none is perfect); an inside picture that still fails is left out. An article only stops if no usable cover can be made.</p>
          </div>
          <div>
            <label className="admin-label">Cover style</label>
            <select className="admin-input" value={cfg.images.coverStyle || 'banner'} onChange={(e) => patch((c) => ((c.images.coverStyle = e.target.value), c))}>
              <option value="banner">Designed banner: title, 4 info cards, icons, feature bar and logo</option>
              <option value="photo">Photo only</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Banner colours and fonts come from your website theme automatically (Site settings → Brand colours). The AI makes only the photo; all words are drawn by the site, so they are always spelled right.</p>
          </div>
          <div className="space-y-3">
            <Toggle checked={cfg.images.showLogo !== false} onChange={(v) => patch((c) => ((c.images.showLogo = v), c))} label="Show our logo on every picture" />
            <div>
              <label className="admin-label">Text in the banner's gold ribbon</label>
              <input className="admin-input" maxLength={40} placeholder="e.g. GoldenVisaUAE.ai (empty = website address)" value={cfg.images.ribbonText || ''} onChange={(e) => patch((c) => ((c.images.ribbonText = e.target.value), c))} />
            </div>
            <Toggle checked={!!cfg.images.officialSymbols} onChange={(v) => patch((c) => ((c.images.officialSymbols = v), c))} label="Real UAE emblem and wording on passports/cards in covers" />
            <p className="text-xs leading-relaxed text-amber-800">Off by default. Using the UAE national emblem in advertising usually needs official approval; when off, passports and cards look real but carry a plain gold crest and no wording. Never shows personal data or ID numbers.</p>
          </div>
          <div className="md:col-span-2">
            <label className="admin-label">House photo style</label>
            <textarea rows={3} className="admin-input" placeholder="e.g. bright, calm, premium; warm natural light; modern Dubai interiors; subtle gold accents" value={cfg.images.houseStyle} onChange={(e) => patch((c) => ((c.images.houseStyle = e.target.value), c))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Minimum sharpness</label>
              <input type="number" min={0} className="admin-input" value={cfg.images.minSharpness} onChange={(e) => patch((c) => ((c.images.minSharpness = Number(e.target.value)), c))} />
              <p className="mt-1 text-xs text-gray-500">Blurry pictures score low. 60 is a safe start.</p>
            </div>
            <div>
              <label className="admin-label">Minimum realism (0–10)</label>
              <input type="number" min={0} max={10} className="admin-input" value={cfg.images.minRealism} onChange={(e) => patch((c) => ((c.images.minRealism = Number(e.target.value)), c))} />
              <p className="mt-1 text-xs text-gray-500">For the cover. Pictures inside the article pass one point lower. 7 is a good balance.</p>
              <p className="mt-1 text-xs text-gray-500">From the AI vision check.</p>
            </div>
          </div>
          <TestPicture />
        </div>
      </Card>
    </div>
  );
}

/** Catches the most common mistake: pasting a key's ID or another provider's key */
function keyWarning(provider: string, key: string): string {
  const k = key.trim();
  if (!k || k.startsWith('••')) return '';
  if ((provider === 'openai' || provider === 'openrouter') && /^key_/i.test(k)) return 'This looks like the key ID ("key_…") shown in the dashboard, not the secret key. Create a new secret key: it starts with "sk-" and is shown only once.';
  if (provider === 'openai' && !k.startsWith('sk-')) return 'OpenAI secret keys start with "sk-" (for example sk-proj-…). Please check that you copied the whole secret key.';
  if (provider === 'openrouter' && !k.startsWith('sk-or-')) return 'OpenRouter keys start with "sk-or-".';
  if (provider === 'claude' && !k.startsWith('sk-ant-')) return 'Claude (Anthropic) keys start with "sk-ant-".';
  if (provider === 'gemini' && !k.startsWith('AIza')) return 'Google Gemini keys usually start with "AIza".';
  return '';
}

function TestPicture() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<any>(null);
  const [title, setTitle] = useState('How much is a UAE Golden Visa for a family?');
  const [idea, setIdea] = useState('');
  async function run() {
    setBusy(true);
    setRes(null);
    try {
      setRes(await api<any>('/api/admin/autopublisher', 'POST', { action: 'testPicture', title, idea }));
    } catch (e: any) {
      setRes({ error: e.message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-xl bg-gray-50 p-4 md:col-span-2">
      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <div>
          <label className="admin-label">Article title</label>
          <input className="admin-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </div>
        <div>
          <label className="admin-label">Your picture idea (optional)</label>
          <input className="admin-input" value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={400} placeholder="e.g. a young family with suitcases arriving at a Dubai villa at sunset" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Btn size="sm" variant="dark" onClick={run} loading={busy} disabled={!title.trim()}>
          <FlaskConical className="h-3.5 w-3.5" /> Test picture
        </Btn>
        <span className="text-xs text-gray-500">Save first. Makes one cover the same way as for a real article (photo library match, AI photo editor, all quality checks). Takes up to 2 minutes, uses 1–4 picture credits, and adds the result to Media.</span>
      </div>
      {res?.error && <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{res.error}</p>}
      {res?.url && (
        <div className="mt-3 grid gap-3 md:grid-cols-[2fr_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={res.url} alt={res.alt} className="w-full rounded-xl ring-1 ring-gray-200" />
          <ul className="space-y-1 text-xs text-gray-600">
            <li>Sharpness: <b>{res.sharpness}</b></li>
            <li>Realism: <b>{res.realism}/10</b></li>
            <li>Alt text: <b>{res.alt}</b></li>
            <li>Attempts: <b>{res.attempts}</b></li>
            <li>Size: <b>{res.width}×{res.height}</b> WebP</li>
            <li>Time: <b>{Math.round(res.ms / 1000)} s</b></li>
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ quality & SEO */
function QualityTab({ cfg, patch }: { cfg: any; patch: (fn: (c: any) => any) => void }) {
  const q = cfg.quality;
  const num = (k: string, label: string, help: string, step = 1, min = 0, max = 100) => (
    <div>
      <label className="admin-label">{label}</label>
      <input type="number" step={step} min={min} max={max} className="admin-input" value={q[k]} onChange={(e) => patch((c) => ((c.quality[k] = Number(e.target.value)), c))} />
      <p className="mt-1 text-xs text-gray-500">{help}</p>
    </div>
  );
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="Quality gates">
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          {num('minQuality', 'Minimum editor quality score', 'Below this the article is rewritten once, then held for review.')}
          {num('minSeo', 'Minimum SEO score', 'Below this one fix pass runs on the failed items only.')}
          {num('maxTextSimilarity', 'Max text similarity', '0.30 = an article may share at most 30% with any of our posts.', 0.01, 0.05, 0.95)}
          {num('maxTitleSimilarity', 'Max title similarity', 'Titles closer than this are regenerated.', 0.01, 0.05, 0.95)}
          {num('maxImageDistance', 'Picture difference (bits)', 'Pictures closer than this to one we used are regenerated.', 1, 0, 32)}
          {num('meaningThreshold', 'Meaning threshold', 'Topic too close in meaning (needs an embedding key).', 0.01, 0.5, 0.99)}
          <div className="sm:col-span-2">
            <label className="admin-label">Meaning check (embeddings)</label>
            <select className="admin-input" value={q.embeddings} onChange={(e) => patch((c) => ((c.quality.embeddings = e.target.value), c))}>
              <option value="off">Off — compare words only (free)</option>
              <option value="gemini">Gemini embeddings (uses the Gemini key)</option>
              <option value="openai">OpenAI embeddings (uses the OpenAI key)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Catches topics that mean the same thing in different words. Costs one small call per post; after switching on, press "Rebuild fingerprints" in Similarity report.</p>
          </div>
        </div>
      </Card>
      <Card title="Schedule & budget">
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          {num('dailyCap', 'Posts per day (whole site)', 'No bursts — posts are spread through the active hours.', 1, 0, 50)}
          {num('refreshPerWeek', 'Old posts refreshed per week', 'Weakest posts first; the old version is kept for one-click restore.', 1, 0, 100)}
          {num('activeFrom', 'Active from (hour, Dubai)', 'Publishing window start. 0 and 24 = any time of day. Ready articles publish at once (30 minutes apart).', 1, 0, 23)}
          {num('activeTo', 'Active until (hour, Dubai)', 'Publishing window end.', 1, 1, 24)}
          {num('maxAiCallsPerDay', 'Max AI calls per day', 'Hard cost limit. When reached, it pauses until tomorrow. 0 = no limit.', 1, 0, 5000)}
          <div>
            <label className="admin-label">Refreshed & replaced posts</label>
            <select className="admin-input" value={q.refreshMode} onChange={(e) => patch((c) => ((c.quality.refreshMode = e.target.value), c))}>
              <option value="publish">Update the live post directly</option>
              <option value="review">Wait for my approval</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">The old version is always kept and can be restored with one click.</p>
          </div>
        </div>
      </Card>
      <Card title={<span className="flex items-center gap-2"><ListChecks className="h-4 w-4" /> Banned phrases</span>} className="xl:col-span-2">
        <div className="p-5">
          <textarea rows={10} className="admin-input font-mono text-xs" value={(q.bannedPhrases || []).join('\n')} onChange={(e) => patch((c) => ((c.quality.bannedPhrases = e.target.value.split('\n')), c))} />
          <p className="mt-1.5 text-xs text-gray-500">One per line. The editor removes these, and the final check blocks any article that still contains one.</p>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ copied posts */
function CopiedTab() {
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState('');
  const load = useCallback(() => api<any>('/api/admin/autopublisher/copied').then(setD).catch((e) => toast(e.message, 'error')), []);
  useEffect(() => {
    load();
  }, [load]);

  async function run(action: 'draft' | 'publish') {
    const msg =
      action === 'draft'
        ? `Move the ${d.summary.published} published copied posts to Draft? They disappear from the website and sitemap immediately. You can undo this.`
        : 'Put the copied posts back online (published)?';
    if (!confirmDialog(msg)) return;
    setBusy(action);
    try {
      const r = await api<any>('/api/admin/autopublisher/copied', 'POST', { action });
      toast(`${r.changed} posts updated`);
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }

  async function replaceAll() {
    if (!confirmDialog(`Queue a completely new, original article for each copied post (same URL)? They are written one at a time in the background — about ${d.summary.total * 6} AI calls plus pictures in total — and follow the "Refreshed & replaced posts" setting in Quality & SEO.`)) return;
    setBusy('replace');
    try {
      const r = await api<any>('/api/admin/autopublisher/copied', 'POST', { action: 'replace' });
      toast(`${r.created} replacement jobs queued`);
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }

  if (!d) return <Spinner />;
  return (
    <Card
      title={`Copied posts · ${d.summary.total}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Btn size="sm" variant="ghost" onClick={() => { setBusy('check'); load().finally(() => setBusy('')); }} loading={busy === 'check'}>
            <RefreshCw className="h-3.5 w-3.5" /> Check again
          </Btn>
          {d.summary.total > 0 && (<>
          <Btn size="sm" variant="danger" onClick={() => run('draft')} loading={busy === 'draft'} disabled={!d.summary.published}>
            <Trash2 className="h-3.5 w-3.5" /> Move all to Draft
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => run('publish')} loading={busy === 'publish'} disabled={!d.summary.draft}>
            <Undo2 className="h-3.5 w-3.5" /> Undo (publish again)
          </Btn>
          <Btn size="sm" variant="outline" onClick={replaceAll} loading={busy === 'replace'}>
            <Sparkles className="h-3.5 w-3.5" /> Replace with original articles
          </Btn>
          </>)}
        </div>
      }
    >
      {!d.items.length ? (
        <div className="flex items-center gap-3 px-5 py-8 text-sm text-gray-600">
          <ShieldCheck className="h-5 w-5 text-emerald-600" /> 0 copied posts found
        </div>
      ) : (
        <div className="max-h-[560px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-5 py-2">Post</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Views</th>
              </tr>
            </thead>
            <tbody>
              {d.items.map((p: any) => (
                <tr key={p.slug} className="border-t border-gray-100">
                  <td className="px-5 py-2.5">
                    <a href={`/admin/posts/${p.id}`} className="font-semibold hover:text-gold-deep">
                      {p.title}
                    </a>
                    <p className="font-mono text-[0.7rem] text-gray-400">/blog/{p.slug}</p>
                    <p className="text-xs text-amber-700">
                      {p.reason}
                      {p.of ? `: "${p.of.title}" (${Math.round((p.score || 0) * 100)}% same)` : ''}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', p.status === 'published' ? 'bg-emerald-50 text-emerald-700' : p.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-700')}>{p.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{p.views || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ logs */
function LogsTab() {
  const [items, setItems] = useState<any[] | null>(null);
  const [level, setLevel] = useState('');
  const load = useCallback(() => api<any>(`/api/admin/autopublisher/logs${level ? `?level=${level}` : ''}`).then((d) => setItems(d.items)).catch((e) => toast(e.message, 'error')), [level]);
  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  async function clear() {
    if (!confirmDialog('Delete all Auto Publisher log lines?')) return;
    await api('/api/admin/autopublisher/logs', 'DELETE');
    load();
  }

  return (
    <Card
      title="Logs"
      actions={
        <div className="flex items-center gap-2">
          <select className="admin-input !w-auto !py-1.5 text-xs" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">All levels</option>
            <option value="info">Info</option>
            <option value="warn">Warnings</option>
            <option value="error">Errors</option>
          </select>
          <Btn size="sm" variant="ghost" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Btn>
          <Btn size="sm" variant="danger" onClick={clear}>
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </Btn>
        </div>
      }
    >
      {!items ? (
        <Spinner />
      ) : !items.length ? (
        <Empty text="No log lines yet." />
      ) : (
        <div className="max-h-[600px] overflow-y-auto font-mono text-xs">
          {items.map((l) => (
            <div key={l.id} className="flex gap-3 border-t border-gray-100 px-5 py-2">
              <span className="shrink-0 text-gray-400">{new Date(l.createdAt).toLocaleString()}</span>
              <span className={cn('shrink-0 font-bold uppercase', l.level === 'error' ? 'text-red-600' : l.level === 'warn' ? 'text-amber-600' : 'text-emerald-600')}>{l.level}</span>
              <span className="break-words text-gray-700">{l.message}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
