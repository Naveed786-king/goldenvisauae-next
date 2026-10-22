'use client';
import { useCallback, useEffect, useState } from 'react';
import { Languages, RefreshCw, Save, Sparkles, Zap, CircleCheck } from 'lucide-react';
import { LOCALES } from '@/lib/i18n/config';
import { Btn, Card, PageTitle, Spinner, Toggle, api, toast } from './ui';
import { cn } from '@/lib/utils';

type Stat = { locale: string; name: string; native: string; flag: string; done: number; oldEngine: number; edited: number; outdated: number; total: number };

export default function LanguagesManager({ isAdmin }: { isAdmin: boolean }) {
  const [cfg, setCfg] = useState<any>(null);
  const [stats, setStats] = useState<Stat[]>([]);
  const [queue, setQueue] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState('');
  const [test, setTest] = useState('');
  const [paused, setPaused] = useState('');

  const load = useCallback(async () => {
    const d = await api<{ stats: Stat[]; queue: any; paused: string }>('/api/admin/translations');
    setStats(d.stats);
    setQueue(d.queue);
    setPaused(d.paused || '');
  }, []);

  useEffect(() => {
    if (isAdmin) api<{ value: any }>('/api/admin/settings/translation').then((d) => setCfg(d.value)).catch((e) => toast(e.message, 'error'));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load, isAdmin]);

  async function save() {
    setSaving(true);
    try {
      await api('/api/admin/settings/translation', 'PUT', { value: cfg });
      toast('Language settings saved — translating with the selected engine');
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function translateAll(force: boolean) {
    if (force && !confirm('Re-translate EVERYTHING in all languages? Manual edits will be replaced.')) return;
    setBusy(force ? 'force' : 'all');
    try {
      await api('/api/admin/translations', 'POST', { action: 'all', force });
      toast('Translation started — it runs in the background');
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }

  async function runTest() {
    setBusy('test');
    setTest('');
    try {
      // test with what is typed on screen (saves the settings first)
      if (cfg) await api('/api/admin/settings/translation', 'PUT', { value: cfg });
      const d = await api<{ result: string }>('/api/admin/translations', 'POST', { action: 'test', locale: 'ar' });
      setTest(d.result);
      toast('Translation works ✔');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Languages & translation"
        subtitle="Your website is available in 10 languages. Everything you write in English (pages, blog posts, FAQs, services, menu, footer) is translated automatically."
        actions={
          <>
            <Btn variant="outline" onClick={() => translateAll(false)} loading={busy === 'all'}>
              <Zap className="h-4 w-4" /> Translate missing now
            </Btn>
            {isAdmin && (
              <Btn variant="ghost" onClick={() => translateAll(true)} loading={busy === 'force'}>
                <RefreshCw className="h-4 w-4" /> Re-translate everything
              </Btn>
            )}
          </>
        }
      />

      {paused && (
        <div className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-800 ring-1 ring-amber-200">
          <p className="font-bold">Built-in translations active — automatic translation of new texts is off</p>
          <p className="mt-1">
            All the original website texts (pages, blog posts, FAQs, services, menu, footer, calculator) are already professionally translated into every language.
            New blog posts and text you change later stay in English until you add an API key: {paused}.
          </p>
        </div>
      )}

      <Card title="Progress" actions={queue && <span className="text-xs text-gray-500">{queue.running ? `Working: ${queue.current} · ${queue.pending} waiting` : queue.pending ? `${queue.pending} waiting` : 'Idle — all up to date'}</span>}>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {!stats.length && <Spinner />}
          {stats.map((s) => {
            const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
            return (
              <div key={s.locale} className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200/70">
                <div className="flex items-center justify-between">
                  <p className="font-bold">
                    <span className="mr-2 text-lg">{s.flag}</span>
                    {s.name} <span className="font-normal text-gray-400">· {s.native}</span>
                  </p>
                  <a href={`/${s.locale}`} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-gold-deep hover:underline">
                    View
                  </a>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-emerald-500' : 'bg-gold')} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  {pct === 100 && <CircleCheck className="h-3.5 w-3.5 text-emerald-500" />}
                  {s.done}/{s.total} items · {pct}%{s.edited ? ` · ${s.edited} edited by hand` : ''}
                  {s.oldEngine ? <span className="text-amber-600"> · {s.oldEngine} from old engine</span> : ''}
                  {s.outdated ? <span className="text-amber-600"> · {s.outdated} need update</span> : ''}
                </p>
              </div>
            );
          })}
        </div>
        {queue?.lastError && <p className="border-t border-gray-100 px-5 py-3 text-xs text-red-600">Last error: {queue.lastError}</p>}
      </Card>

      {isAdmin && (
        <Card title="Settings" actions={<Btn onClick={save} loading={saving} size="sm"><Save className="h-4 w-4" /> Save</Btn>}>
          {!cfg ? (
            <Spinner />
          ) : (
            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <div className="space-y-5">
                <div>
                  <label className="admin-label">Translation engine</label>
                  <select className="admin-input" value={cfg.provider} onChange={(e) => setCfg({ ...cfg, provider: e.target.value })}>
                    <option value="gemini">Google Gemini AI — natural, human-like quality (recommended)</option>
                    <option value="claude">Claude AI — human-like quality</option>
                    <option value="deepl">DeepL — good quality (no Hindi)</option>
                    <option value="google">Google Translate — free, basic quality</option>
                    <option value="off">Off — I will translate by hand</option>
                  </select>
                </div>
                {cfg.provider === 'gemini' && (
                  <>
                    <div>
                      <label className="admin-label">Gemini API key</label>
                      <input type="password" className="admin-input font-mono" value={cfg.geminiKey || ''} onChange={(e) => setCfg({ ...cfg, geminiKey: e.target.value })} placeholder="AIza…" autoComplete="off" />
                      <p className="mt-1.5 text-xs text-gray-500">
                        Create a key at <a className="font-bold text-gold-deep underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com/apikey</a>. Your pages use the built-in professional translations; Gemini translates new blog posts and any new text you add.
                      </p>
                    </div>
                    <div>
                      <label className="admin-label">Gemini model</label>
                      <input className="admin-input font-mono" list="gemini-models" value={cfg.geminiModel || ''} onChange={(e) => setCfg({ ...cfg, geminiModel: e.target.value })} placeholder="gemini-3.8-flash" />
                      <datalist id="gemini-models">
                        <option value="gemini-3.8-flash">Fast, very good quality (recommended)</option>
                        <option value="gemini-4-argon">Best quality, slower</option>
                        <option value="gemini-3.1-pro-preview">Pro (preview)</option>
                      </datalist>
                      <p className="mt-1.5 text-xs text-gray-500">gemini-3.8-flash = fast, best for publishing · gemini-4-argon = top quality, slower. Any model name from Google AI Studio works.</p>
                    </div>
                  </>
                )}
                {(cfg.provider === 'claude' || cfg.provider === 'deepl') && (
                  <>
                    <div>
                      <label className="admin-label">API key</label>
                      <input type="password" className="admin-input font-mono" value={cfg.apiKey || ''} onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })} placeholder={cfg.provider === 'claude' ? 'sk-ant-…' : 'xxxxxxxx-…:fx'} autoComplete="off" />
                      <p className="mt-1.5 text-xs text-gray-500">
                        {cfg.provider === 'claude' ? (
                          <>Get a key at <a className="font-bold text-gold-deep underline" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a> (add a few dollars of credit — translating the whole website costs very little).</>
                        ) : (
                          <>Get a free key at <a className="font-bold text-gold-deep underline" href="https://www.deepl.com/pro-api" target="_blank" rel="noopener noreferrer">deepl.com/pro-api</a> (500,000 characters per month free).</>
                        )}
                      </p>
                    </div>
                    {cfg.provider === 'claude' && (
                      <div>
                        <label className="admin-label">Claude model</label>
                        <input className="admin-input font-mono" value={cfg.model || ''} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} placeholder="claude-sonnet-5-5" />
                        <p className="mt-1.5 text-xs text-gray-500">claude-sonnet-5-5 = best quality · claude-haiku-5-5 = cheaper and faster</p>
                      </div>
                    )}
                  </>
                )}
                <Toggle checked={!!cfg.autoTranslate} onChange={(v) => setCfg({ ...cfg, autoTranslate: v })} label="Translate automatically when I save (blogs, pages, FAQs…)" />
                <Toggle checked={!!cfg.showSwitcher} onChange={(v) => setCfg({ ...cfg, showSwitcher: v })} label="Show the language switcher on the website" />
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                  <Btn variant="dark" size="sm" onClick={runTest} loading={busy === 'test'}>
                    <Sparkles className="h-4 w-4" /> Test translation
                  </Btn>
                  <span className="text-sm" dir="rtl">{test}</span>
                </div>
              </div>
              <div>
                <label className="admin-label">Languages shown on the website</label>
                <div className="grid grid-cols-2 gap-2">
                  {LOCALES.map((l) => {
                    const on = cfg.enabled.includes(l.code);
                    return (
                      <button
                        key={l.code}
                        type="button"
                        disabled={l.code === 'en'}
                        onClick={() => setCfg({ ...cfg, enabled: on ? cfg.enabled.filter((x: string) => x !== l.code) : [...cfg.enabled, l.code] })}
                        className={cn('flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm ring-1 transition', on ? 'bg-gold/10 ring-gold font-bold' : 'ring-gray-200 text-gray-500')}
                      >
                        <span className="text-lg">{l.flag}</span>
                        {l.name}
                        <span className="ml-auto text-xs">{on ? '✓' : ''}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  <Languages className="mr-1 inline h-3.5 w-3.5" />
                  Website addresses: English at <code>/</code>, others like <code>/ar</code>, <code>/ru/about-us</code>. Google sees every language (hreflang + sitemap).
                </p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
