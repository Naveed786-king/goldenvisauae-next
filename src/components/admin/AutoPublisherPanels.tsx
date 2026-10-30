'use client';
// Phase 2 tabs of Admin → Auto Publisher: live jobs, missions, review queue, keywords, company knowledge, similarity report.
import { useCallback, useEffect, useState } from 'react';
import { Copy, Eye, FilePenLine, Layers, Pencil, Play, Plus, RefreshCw, RotateCcw, Search, Send, Trash2, Undo2, Wand2 } from 'lucide-react';
import { Btn, Card, Empty, Modal, Spinner, Toggle, api, confirmDialog, toast } from './ui';
import { cn } from '@/lib/utils';

const LOCALES = [
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
const STAGE_LABEL: Record<string, string> = { queued: 'Queued', research: 'Research', brief: 'Brief', write: 'Writing', edit: 'Editing', check: 'Checks', images: 'Pictures', publish: 'Publishing', native: 'Native languages', done: 'Done', held: 'Held', failed: 'Failed' };

function when(d?: string | null) {
  return d ? new Date(d).toLocaleString() : '';
}

/* ------------------------------------------------------------------ live jobs (Overview) */
export function LiveJobs({ enabled }: { enabled: boolean }) {
  const [d, setD] = useState<any>(null);
  const [mission, setMission] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(() => api<any>('/api/admin/autopublisher/jobs').then(setD).catch(() => null), []);
  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 5000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => {
    if (d?.missions?.length && !mission) setMission(d.missions[0].id);
  }, [d, mission]);

  async function run(action: string, extra: any = {}) {
    setBusy(action + (extra.jobId || ''));
    try {
      const r = await api<any>('/api/admin/autopublisher/jobs', 'POST', { action, ...extra });
      const msg: Record<string, string> = { off: 'Publisher is off', idle: 'Nothing to do right now', locked: 'Another step is running — try again shortly', backoff: 'Waiting for the AI provider (rate limit)', budget: 'Daily AI budget reached', no_key: 'Add an API key first', scheduled: 'New article job created', error: 'Step failed — see Logs', started: 'Started — progress shows below' };
      toast(r.did?.startsWith('stage:') ? `Step done: ${STAGE_LABEL[r.did.slice(6)] || r.did.slice(6)}` : msg[r.did] || 'Done', r.did === 'error' ? 'error' : 'success');
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }

  const name = (id: string) => d?.missions?.find((m: any) => m.id === id)?.name || '—';
  if (!d) return <Spinner />;
  return (
    <Card
      title="Articles on their way"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Btn size="sm" variant="outline" onClick={() => run('step')} loading={busy === 'step'}>
            <Play className="h-3.5 w-3.5" /> Continue now
          </Btn>
          {d.missions.length > 0 && (
            <>
              <select className="admin-input !w-auto !py-1.5 text-xs" value={mission} onChange={(e) => setMission(e.target.value)}>
                {d.missions.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <Btn size="sm" variant="dark" onClick={() => run('write', { missionId: mission })} loading={busy === 'write'}>
                <Wand2 className="h-3.5 w-3.5" /> Write one article now
              </Btn>
            </>
          )}
        </div>
      }
    >
      <p className="border-b border-gray-100 px-5 py-2.5 text-xs text-gray-500">
        {d.queued ? `${d.queued} replacement/refresh jobs queued (one runs at a time). ` : ''}
        {enabled ? 'Runs automatically. Each article is researched, written, checked, fixed by the AI editor, given pictures and published — usually within 10 minutes. "Write one article now" starts one right away and follows the mission\'s publishing mode.' : 'The publisher is off: nothing runs on its own. "Write one article now" still writes one right away and follows the mission\'s publishing mode.'}
      </p>
      {!d.active.length && !d.recent.length ? (
        <Empty text={d.missions.length ? 'No articles in progress.' : 'Create a mission first (Missions tab).'} />
      ) : (
        <div className="divide-y divide-gray-100">
          {[...d.active, ...d.recent].map((j: any) => (
            <div key={j.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{j.title || j.topic || 'Choosing a topic…'}</p>
                <p className="text-xs text-gray-500">
                  {j.kind === 'new' ? name(j.missionId) : j.kind === 'refresh' ? 'Refresh of an old post' : 'Replacement of a copied post'} · {STAGE_LABEL[j.stage] || j.stage}
                  {j.pending && ' · waiting for approval'}
                  {j.applied && ' · applied'}
                  {j.quality != null && ` · quality ${j.quality}`}
                  {j.seo != null && ` · SEO ${j.seo}`}
                  {j.retryAt && ` · retry ${when(j.retryAt)}`}
                  {j.publishAt && j.stage === 'publish' && ` · publishes ${when(j.publishAt)}`}
                </p>
                {j.error && <p className={cn('mt-0.5 text-xs', j.stage === 'held' ? 'text-amber-700' : 'text-red-600')}>{j.error}</p>}
              </div>
              <div className="w-40">
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div className={cn('h-full rounded-full', j.stage === 'failed' ? 'bg-red-400' : j.stage === 'held' ? 'bg-amber-400' : j.stage === 'done' ? 'bg-emerald-500' : 'bg-gold')} style={{ width: `${j.stage === 'failed' || j.stage === 'held' ? 100 : j.progress}%` }} />
                </div>
                <p className="mt-1 text-right text-[0.68rem] text-gray-400">{STAGE_LABEL[j.stage]}</p>
              </div>
              <div className="flex gap-1">
                {['research', 'brief', 'write', 'edit', 'check', 'images', 'publish', 'native'].includes(j.stage) && (
                  <Btn size="sm" variant="ghost" title="Run this job's next step now" onClick={() => run('step', { jobId: j.id })} loading={busy === 'step' + j.id}>
                    <Play className="h-3.5 w-3.5" />
                  </Btn>
                )}
                {(j.stage === 'failed' || (j.stage === 'held' && /^Picture/i.test(j.error || ''))) && (
                  <Btn size="sm" variant="ghost" title={j.stage === 'held' ? 'Make new pictures' : 'Retry'} onClick={() => run('retry', { jobId: j.id })}>
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Btn>
                )}
                {j.canRestore && (
                  <Btn size="sm" variant="ghost" title="Restore the old version of this post" onClick={() => confirmDialog('Put the old version of this post back?') && run('restore', { jobId: j.id })}>
                    <Undo2 className="h-3.5 w-3.5" />
                  </Btn>
                )}
                {j.postId && (
                  <a href={`/admin/posts/${j.postId}`} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100" title="Open post">
                    <FilePenLine className="h-4 w-4" />
                  </a>
                )}
                <Btn size="sm" variant="ghost" title="Delete job" onClick={() => confirmDialog('Delete this job? (a published post is kept)') && run('delete', { jobId: j.id })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ missions */
const EMPTY_MISSION = {
  name: '',
  active: true,
  focus: 'UAE Golden Visa and residency: eligibility, costs, documents, family and property routes',
  keywords: 'uae golden visa\ndubai golden visa\ngolden visa property\nfamily visa uae',
  markets: ['AE', 'IN', 'PK', 'GB'],
  languages: [],
  postsPerWeek: 7,
  publishMode: 'publish',
  category: '',
  minWords: 1500,
  maxWords: 2500,
  tone: 'Expert, warm and practical — like a senior consultant explaining to a client',
  customTitles: '',
  nativeLanguages: [],
  stopRule: { type: 'never', value: '' },
};

export function MissionsTab() {
  const [d, setD] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [marketQ, setMarketQ] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => api<any>('/api/admin/autopublisher/missions').then(setD).catch((e) => toast(e.message, 'error')), []);
  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      await api('/api/admin/autopublisher/missions', edit.id ? 'PUT' : 'POST', edit);
      toast('Mission saved');
      setEdit(null);
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!d) return <Spinner />;
  const set = (k: string, v: any) => setEdit((m: any) => ({ ...m, [k]: v }));
  const toggleIn = (k: string, v: string) => setEdit((m: any) => ({ ...m, [k]: (m[k] || []).includes(v) ? m[k].filter((x: string) => x !== v) : [...(m[k] || []), v] }));

  return (
    <>
      <Card
        title="Missions"
        actions={
          <Btn size="sm" onClick={() => setEdit({ ...EMPTY_MISSION, name: `Mission ${d.items.length + 1}` })}>
            <Plus className="h-3.5 w-3.5" /> New mission
          </Btn>
        }
      >
        {!d.items.length ? (
          <Empty text="No missions yet. A mission tells the publisher what to write about, for which markets and how often." />
        ) : (
          <div className="divide-y divide-gray-100">
            {d.items.map((m: any) => (
              <div key={m.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {m.name} {!m.active && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">paused</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {m.postsPerWeek}/week · {m.publishMode === 'publish' ? 'publishes automatically' : 'review first'} · {m.markets.slice(0, 6).map((c: string) => d.markets[c]?.flag || c).join(' ')}{m.markets.length > 6 ? ` +${m.markets.length - 6}` : ''} · {m.total} written
                    {m.lastRunAt && ` · last ${when(m.lastRunAt)}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Btn size="sm" variant="ghost" onClick={() => setEdit({ ...m })}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Btn>
                  <Btn size="sm" variant="ghost" onClick={() => api('/api/admin/autopublisher/missions', 'POST', { duplicateOf: m.id }).then(load)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Btn>
                  <Btn size="sm" variant="danger" onClick={() => confirmDialog(`Delete mission "${m.name}"? Articles already written stay.`) && api(`/api/admin/autopublisher/missions?id=${m.id}`, 'DELETE').then(load)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        wide="xl"
        title={edit?.id ? 'Edit mission' : 'New mission'}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setEdit(null)}>
              Cancel
            </Btn>
            <Btn onClick={save} loading={saving}>
              Save mission
            </Btn>
          </>
        }
      >
        {edit && (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="admin-label">Name</label>
              <input className="admin-input" value={edit.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="flex items-end">
              <Toggle checked={edit.active} onChange={(v) => set('active', v)} label="Active" />
            </div>
            <div className="md:col-span-2">
              <label className="admin-label">Focus — what this mission is about, in plain words</label>
              <textarea rows={2} className="admin-input" value={edit.focus} onChange={(e) => set('focus', e.target.value)} />
            </div>
            <div>
              <label className="admin-label">Seed keywords (one per line)</label>
              <textarea rows={6} className="admin-input font-mono text-xs" value={edit.keywords} onChange={(e) => set('keywords', e.target.value)} />
            </div>
            <div>
              <label className="admin-label">Custom titles (optional, one per line)</label>
              <textarea rows={6} className="admin-input font-mono text-xs" placeholder="Golden Visa for nurses | 2026-11-05 | Golden Visa | /uploads/media/nurse.webp" value={edit.customTitles} onChange={(e) => set('customTitles', e.target.value)} />
              <p className="mt-1 text-xs text-gray-500">Format: Title | date | category | image URL — only the title is required. Custom titles are written first, in order.</p>
            </div>
            <div className="md:col-span-2">
              <label className="admin-label">Markets (where readers search from) · {edit.markets.length} selected</label>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <input className="admin-input max-w-xs" placeholder="Search a country…" value={marketQ} onChange={(e) => setMarketQ(e.target.value)} />
                <Btn size="sm" variant="ghost" onClick={() => set('markets', Object.keys(d.markets))}>Select all countries</Btn>
                <Btn size="sm" variant="ghost" onClick={() => set('markets', ['AE'])}>Clear</Btn>
              </div>
              <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                {Object.entries(d.markets)
                  .filter(([c, m]: any) => !marketQ || `${c} ${m.name}`.toLowerCase().includes(marketQ.toLowerCase()) || edit.markets.includes(c))
                  .map(([c, m]: any) => (
                  <button key={c} type="button" onClick={() => toggleIn('markets', c)} className={cn('rounded-full px-3 py-1.5 text-xs font-bold ring-1', edit.markets.includes(c) ? 'bg-ink text-white ring-ink' : 'bg-white text-gray-600 ring-gray-200')}>
                    {m.flag} {m.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="admin-label">Languages (translation uses the site's languages; empty = all enabled languages)</label>
              <div className="flex flex-wrap gap-2">
                {LOCALES.filter(([c]) => c !== 'en').map(([c, n]) => (
                  <button key={c} type="button" onClick={() => toggleIn('languages', c)} className={cn('rounded-full px-3 py-1.5 text-xs font-bold ring-1', edit.languages.includes(c) ? 'bg-ink text-white ring-ink' : 'bg-white text-gray-600 ring-gray-200')}>
                    {n}
                  </button>
                ))}
              </div>
              {edit.languages.length > 0 && (
                <div className="mt-3 rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-bold text-gray-600">Native rewrite (adapted by AI for that market instead of a plain translation — one extra AI call per language):</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {edit.languages.map((c: string) => (
                      <Toggle key={c} checked={(edit.nativeLanguages || []).includes(c)} onChange={() => toggleIn('nativeLanguages', c)} label={LOCALES.find(([x]) => x === c)?.[1] || c} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="admin-label">Posts per week</label>
                <input type="number" min={0} max={70} className="admin-input" value={edit.postsPerWeek} onChange={(e) => set('postsPerWeek', Number(e.target.value))} />
              </div>
              <div>
                <label className="admin-label">After writing</label>
                <select className="admin-input" value={edit.publishMode} onChange={(e) => set('publishMode', e.target.value)}>
                  <option value="publish">Publish automatically</option>
                  <option value="review">Save as draft for my approval</option>
                </select>
              </div>
              <div>
                <label className="admin-label">Min words</label>
                <input type="number" className="admin-input" value={edit.minWords} onChange={(e) => set('minWords', Number(e.target.value))} />
              </div>
              <div>
                <label className="admin-label">Max words</label>
                <input type="number" className="admin-input" value={edit.maxWords} onChange={(e) => set('maxWords', Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="admin-label">Category (empty = AI picks one of the existing categories)</label>
                <input className="admin-input" value={edit.category} onChange={(e) => set('category', e.target.value)} />
              </div>
              <div>
                <label className="admin-label">Tone</label>
                <input className="admin-input" value={edit.tone} onChange={(e) => set('tone', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="admin-label">Stop</label>
                  <select className="admin-input" value={edit.stopRule?.type || 'never'} onChange={(e) => set('stopRule', { ...edit.stopRule, type: e.target.value })}>
                    <option value="never">Never</option>
                    <option value="date">On a date</option>
                    <option value="count">After N posts</option>
                    <option value="titles">When custom titles run out</option>
                  </select>
                </div>
                {['date', 'count'].includes(edit.stopRule?.type) && (
                  <div>
                    <label className="admin-label">{edit.stopRule.type === 'date' ? 'Date' : 'Posts'}</label>
                    <input type={edit.stopRule.type === 'date' ? 'date' : 'number'} className="admin-input" value={edit.stopRule.value || ''} onChange={(e) => set('stopRule', { ...edit.stopRule, value: e.target.value })} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ review queue */
export function ReviewTab() {
  const [d, setD] = useState<any>(null);
  const [view, setView] = useState<any>(null);
  const [busy, setBusy] = useState('');
  const load = useCallback(() => api<any>('/api/admin/autopublisher/jobs?view=review').then(setD).catch((e) => toast(e.message, 'error')), []);
  useEffect(() => {
    load();
  }, [load]);

  async function act(action: string, j: any, extra: any = {}) {
    setBusy(action + j.id);
    try {
      const r = await api<any>('/api/admin/autopublisher/jobs', 'POST', { action, jobId: j.id, ...extra });
      if (action === 'edit' && r.postId) window.location.href = `/admin/posts/${r.postId}`;
      else toast(action === 'publish' ? 'Published — translation and search-engine ping started' : action === 'rewrite' ? 'Sent back for a rewrite' : 'Done');
      setView(null);
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }

  if (!d) return <Spinner />;
  const rows = [
    ...(d.pending || []).map((x: any) => ({ ...x, kindLabel: x.kind === 'refresh' ? 'Refresh ready' : 'Replacement ready' })),
    ...d.drafts.map((x: any) => ({ ...x, kindLabel: 'Draft ready' })),
    ...d.held.map((x: any) => ({ ...x, kindLabel: 'Held' })),
  ];
  return (
    <>
      <Card title={`Review queue · ${rows.length}`} actions={<Btn size="sm" variant="ghost" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Btn>}>
        {!rows.length ? (
          <Empty text="Nothing waiting for review." />
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((j: any) => (
              <div key={j.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    <span className={cn('mr-2 rounded-full px-2 py-0.5 text-[0.68rem] font-bold', j.kindLabel === 'Held' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>{j.kindLabel}</span>
                    {j.title || j.post?.title || j.topic}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Quality {j.quality ?? '—'} · SEO {j.seo ?? '—'}
                    {j.similarity && ` · similarity text ${Math.round(j.similarity.text * 100)}% / title ${Math.round(j.similarity.title * 100)}%`}
                  </p>
                  {j.heldReason && <p className="mt-0.5 text-xs text-amber-700">{j.heldReason}</p>}
                  {j.targetSlug && (
                    <a href={`/blog/${j.targetSlug}`} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-block text-xs font-bold text-gold-deep underline">
                      Current live version
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  <Btn size="sm" variant="outline" onClick={() => setView(j)}>
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Btn>
                  <Btn size="sm" onClick={() => confirmDialog(j.pending || j.kind !== 'new' ? 'Replace the live post with this new version? The old version is kept and can be restored.' : 'Publish this article now?') && act('publish', j)} loading={busy === 'publish' + j.id}>
                    <Send className="h-3.5 w-3.5" /> {j.pending || j.kind !== 'new' ? 'Apply' : 'Publish'}
                  </Btn>
                  {j.kind === 'new' && (
                    <Btn size="sm" variant="ghost" onClick={() => act('edit', j)} loading={busy === 'edit' + j.id}>
                      <FilePenLine className="h-3.5 w-3.5" /> Edit
                    </Btn>
                  )}
                  <Btn size="sm" variant="ghost" onClick={() => act('rewrite', j, { notes: prompt('Notes for the rewrite (optional):') || '' })}>
                    <RotateCcw className="h-3.5 w-3.5" /> Rewrite
                  </Btn>
                  <Btn size="sm" variant="danger" onClick={() => confirmDialog('Delete this article and its job?') && act('delete', j, { deletePost: true })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Modal open={!!view} onClose={() => setView(null)} wide="xl" title={view?.title || view?.post?.title || 'Preview'}>
        {view && (
          <div className="space-y-4">
            <div className="grid gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="font-bold">Quality {view.quality ?? '—'}</p>
                <ul className="mt-1 list-disc pl-4 text-gray-600">{(view.qualityReasons || []).slice(0, 5).map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="font-bold">SEO {view.seo ?? '—'}</p>
                <ul className="mt-1 list-disc pl-4 text-gray-600">{(view.seoFailed || []).map((r: string) => <li key={r}>{r}</li>)}</ul>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="font-bold">Similarity</p>
                {view.similarity ? (
                  <p className="mt-1 text-gray-600">
                    Text {Math.round(view.similarity.text * 100)}% · title {Math.round(view.similarity.title * 100)}% · web {Math.round((view.similarity.web || 0) * 100)}%
                  </p>
                ) : (
                  <p className="mt-1 text-gray-400">—</p>
                )}
                {view.honesty?.numbers?.length > 0 && <p className="mt-1 text-amber-700">Unsupported figures: {view.honesty.numbers.join(', ')}</p>}
              </div>
            </div>
            {view.preview?.meta && (
              <div className="rounded-xl ring-1 ring-gray-200 p-3 text-sm">
                <p className="text-[#1a0dab]">{view.preview.meta.seoTitle}</p>
                <p className="text-xs text-emerald-700">goldenvisauae.ai/blog/{view.preview.meta.slug}</p>
                <p className="text-xs text-gray-600">{view.preview.meta.metaDescription}</p>
              </div>
            )}
            {view.preview?.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={view.preview.cover} alt="" className="w-full rounded-xl" />
            )}
            <div className="rte max-h-[60vh] overflow-y-auto rounded-xl p-5 ring-1 ring-gray-200" dangerouslySetInnerHTML={{ __html: view.preview?.html || '' }} />
          </div>
        )}
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ keywords */
export function KeywordsTab() {
  const [d, setD] = useState<any>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [adding, setAdding] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(() => api<any>(`/api/admin/autopublisher/keywords?q=${encodeURIComponent(q)}&status=${status}`).then(setD).catch((e) => toast(e.message, 'error')), [q, status]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function post(body: any, label: string) {
    setBusy(label);
    try {
      const r = await api<any>('/api/admin/autopublisher/keywords', 'POST', body);
      if (body.action === 'research') toast(`Research done: ${r.requests} lookups, ${r.saved} new keywords`);
      if (body.action === 'add') {
        toast(`${r.added} keywords added`);
        setAdding('');
      }
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <Card
        title={`Keyword bank${d ? ` · ${(d.counts.new || 0) + (d.counts.used || 0) + (d.counts.skipped || 0)}` : ''}`}
        actions={
          <Btn size="sm" variant="dark" onClick={() => post({ action: 'research' }, 'research')} loading={busy === 'research'}>
            <Search className="h-3.5 w-3.5" /> Research now
          </Btn>
        }
      >
        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-5 py-3">
          <input className="admin-input !w-64" placeholder="Search keywords" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="admin-input !w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All ({d ? (d.counts.new || 0) + (d.counts.used || 0) + (d.counts.skipped || 0) : 0})</option>
            <option value="new">New ({d?.counts.new || 0})</option>
            <option value="used">Used ({d?.counts.used || 0})</option>
            <option value="skipped">Skipped ({d?.counts.skipped || 0})</option>
          </select>
        </div>
        {!d ? (
          <Spinner />
        ) : !d.items.length ? (
          <Empty text="No keywords yet. Create a mission, then press Research now." />
        ) : (
          <div className="max-h-[620px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-400">
                <tr>
                  <th className="px-5 py-2">Keyword</th>
                  <th className="px-2 py-2">Score</th>
                  <th className="px-2 py-2">Intent</th>
                  <th className="px-2 py-2">Market</th>
                  <th className="px-2 py-2">Source</th>
                  <th className="px-2 py-2">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.items.map((k: any) => (
                  <tr key={k.id} className="border-t border-gray-100">
                    <td className="px-5 py-2 font-medium">{k.keyword}</td>
                    <td className="px-2 py-2 tabular-nums">{Math.round(k.score)}</td>
                    <td className="px-2 py-2 text-xs">{k.intent}</td>
                    <td className="px-2 py-2 text-xs">{k.market}</td>
                    <td className="px-2 py-2 text-xs">{k.source}</td>
                    <td className="px-2 py-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-[0.68rem] font-bold', k.status === 'new' ? 'bg-sky-50 text-sky-700' : k.status === 'used' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500')}>{k.status}</span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button className="text-xs font-bold text-gray-500 hover:text-gray-900" onClick={() => post({ action: 'status', id: k.id, status: k.status === 'skipped' ? 'new' : 'skipped' }, '')}>
                        {k.status === 'skipped' ? 'Restore' : 'Skip'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title="Add keywords by hand">
        <div className="space-y-3 p-5">
          <textarea rows={8} className="admin-input font-mono text-xs" placeholder={'golden visa for nurses uae\nhow to renew golden visa from abroad'} value={adding} onChange={(e) => setAdding(e.target.value)} />
          <Btn size="sm" onClick={() => post({ action: 'add', keywords: adding }, 'add')} loading={busy === 'add'} disabled={!adding.trim()}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Btn>
          <p className="text-xs text-gray-500">One per line, at least two words. Manual keywords get a high score so they are written soon.</p>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ company knowledge */
const KNOWLEDGE: [string, string, string][] = [
  ['about', 'About Brightlink', 'Who we are, office, licence details exactly as you want them shown.'],
  ['services', 'Services we offer (extra notes)', 'Your active services are read automatically — add anything they do not say.'],
  ['prices', 'Real prices and fees', 'The cost calculator prices are read automatically. Only these numbers may appear as our prices.'],
  ['timelines', 'Real timelines', 'e.g. "Property Golden Visa: usually 5–10 working days after a complete file".'],
  ['cases', 'Real anonymised cases', 'e.g. "An Indian engineer earning AED 32,000 basic was approved in 6 days". Never names.'],
  ['mistakes', 'Common mistakes we see', 'What goes wrong in real files — this makes articles genuinely useful.'],
  ['rules', 'Rules: never say or promise', 'e.g. never guarantee approval, never quote a fee that is not listed.'],
  ['cta', 'Call to action', 'How to invite the reader: WhatsApp, the cost calculator, /apply.'],
];

export function KnowledgeTab({ cfg, patch }: { cfg: any; patch: (fn: (c: any) => any) => void }) {
  return (
    <Card title={<span className="flex items-center gap-2"><Layers className="h-4 w-4" /> Company knowledge</span>}>
      <p className="border-b border-gray-100 px-5 py-3 text-sm text-gray-600">The writer may use only these facts for anything about the company, prices, timelines and cases. If a box is empty, articles stay general — nothing is invented. Press "Save changes" at the top when done.</p>
      <div className="grid gap-5 p-5 lg:grid-cols-2">
        {KNOWLEDGE.map(([k, label, help]) => (
          <div key={k}>
            <label className="admin-label">{label}</label>
            <textarea rows={5} className="admin-input" value={cfg.knowledge?.[k] || ''} onChange={(e) => patch((c) => ((c.knowledge[k] = e.target.value), c))} />
            <p className="mt-1 text-xs text-gray-500">{help}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ similarity report */
export function ReportTab() {
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<any>('/api/admin/autopublisher/report').then(setD).catch((e) => toast(e.message, 'error')), []);
  useEffect(() => {
    load();
  }, [load]);

  async function rebuild() {
    setBusy(true);
    try {
      const r = await api<any>('/api/admin/autopublisher/report', 'POST', { force: true });
      toast(`Fingerprints updated for ${r.done} posts`);
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  const pct = (n: number) => `${Math.round((n || 0) * 100)}%`;
  return (
    <Card
      title={d ? `Similarity report · ${d.pairs.length} pairs` : 'Similarity report'}
      actions={
        <Btn size="sm" variant="outline" onClick={rebuild} loading={busy}>
          <RefreshCw className="h-3.5 w-3.5" /> Rebuild fingerprints
        </Btn>
      }
    >
      {!d ? (
        <Spinner />
      ) : (
        <>
          <p className="border-b border-gray-100 px-5 py-3 text-sm text-gray-600">
            {d.fingerprinted} of {d.posts} posts fingerprinted. Pairs below compete with each other for the same searches — merge them, refresh one, or give one a different focus keyword.
          </p>
          {!d.pairs.length ? (
            <Empty text={d.fingerprinted ? 'No competing posts found.' : 'Press "Rebuild fingerprints" to scan your posts.'} />
          ) : (
            <div className="max-h-[640px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-5 py-2">Post A</th>
                    <th className="px-3 py-2">Post B</th>
                    <th className="px-2 py-2">Text</th>
                    <th className="px-2 py-2">Title</th>
                    <th className="px-2 py-2">Meaning</th>
                    <th className="px-3 py-2">Suggested</th>
                  </tr>
                </thead>
                <tbody>
                  {d.pairs.map((p: any, i: number) => (
                    <tr key={i} className="border-t border-gray-100 align-top">
                      <td className="px-5 py-2.5">
                        <a href={`/admin/posts/${p.a.id}`} className="font-semibold hover:text-gold-deep">
                          {p.a.title}
                        </a>
                      </td>
                      <td className="px-3 py-2.5">
                        <a href={`/admin/posts/${p.b.id}`} className="font-semibold hover:text-gold-deep">
                          {p.b.title}
                        </a>
                      </td>
                      <td className="px-2 py-2.5 tabular-nums">{pct(p.text)}</td>
                      <td className="px-2 py-2.5 tabular-nums">{pct(p.title)}</td>
                      <td className="px-2 py-2.5 tabular-nums">{p.meaning ? pct(p.meaning) : '—'}</td>
                      <td className="px-3 py-2.5 text-xs font-bold text-gray-600">
                        {p.action}
                        {p.sameKeyword && <span className="block font-normal text-amber-700">same keyword</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

