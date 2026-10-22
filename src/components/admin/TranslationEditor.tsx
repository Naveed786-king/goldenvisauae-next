'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, Save, ExternalLink, ChevronDown } from 'lucide-react';
import { BLOCK_MAP } from '@/components/blocks/schema';
import type { Block, Field } from '@/components/blocks/types';
import { SKIP_FIELDS } from '@/lib/i18n/fields';
import { LOCALES, localizePath } from '@/lib/i18n/config';
import RichEditor from './RichEditor';
import { Btn, Card, Spinner, api, toast } from './ui';
import { cn, postPath } from '@/lib/utils';

/** Language tabs for a blog post or page: view / edit / re-translate each language */
export function LanguageTabs({ entityId, value, onChange, entity = 'post' }: { entityId?: string; value: string; onChange: (l: string) => void; entity?: 'post' | 'page' }) {
  const [rows, setRows] = useState<{ locale: string; status: string }[]>([]);
  useEffect(() => {
    if (!entityId) return;
    const load = () => api<{ rows: any[] }>(`/api/admin/translations?entity=${entity}&id=${entityId}`).then((d) => setRows(d.rows)).catch(() => {});
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [entityId, entity]);
  return (
    <div className="flex flex-wrap gap-1.5 rounded-2xl bg-white p-1.5 ring-1 ring-gray-200">
      {LOCALES.map((l) => {
        const r = rows.find((x) => x.locale === l.code);
        const dot = l.code === 'en' ? '' : !r ? 'bg-gray-300' : r.status === 'outdated' ? 'bg-amber-500' : r.status === 'edited' ? 'bg-blue-500' : 'bg-emerald-500';
        return (
          <button
            key={l.code}
            type="button"
            disabled={!entityId && l.code !== 'en'}
            onClick={() => onChange(l.code)}
            title={l.code === 'en' ? 'Original' : !r ? 'Not translated yet' : r.status}
            className={cn('flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-40', value === l.code ? 'bg-ink text-white' : 'text-gray-600 hover:bg-gray-100')}
          >
            <span>{l.flag}</span> {l.code.toUpperCase()}
            {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
          </button>
        );
      })}
    </div>
  );
}

export function PostTranslation({ id, slug, locale }: { id: string; slug: string; locale: string }) {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const info = LOCALES.find((l) => l.code === locale)!;

  const load = async () => {
    setData(null);
    const d = await api<{ translation: any }>(`/api/admin/translations?entity=post&id=${id}&locale=${locale}`);
    setData(d.translation?.data || {});
    setStatus(d.translation?.status || 'missing');
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, locale]);

  async function save() {
    setSaving(true);
    try {
      await api('/api/admin/translations', 'PUT', { entity: 'post', id, locale, data });
      setStatus('edited');
      toast(`${info.name} version saved`);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }
  async function retranslate() {
    if (status === 'edited' && !confirm('Replace your manual edits with a fresh automatic translation?')) return;
    setBusy(true);
    try {
      await api('/api/admin/translations', 'POST', { action: 'entity', entity: 'post', id, locale });
      toast(`Translated to ${info.name}`);
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <Spinner />;
  const set = (k: string, v: string) => setData((d: any) => ({ ...d, [k]: v }));
  const label: Record<string, string> = { missing: 'Not translated yet', auto: 'Translated automatically', edited: 'Edited by hand', outdated: 'English changed — update needed' };

  return (
    <div className="space-y-5" dir={info.dir}>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-gold/10 p-4" dir="ltr">
        <span className="text-2xl">{info.flag}</span>
        <div className="flex-1">
          <p className="font-bold">{info.name} version</p>
          <p className="text-xs text-gray-600">{label[status] || status}. Change anything below and click “Save {info.name}”.</p>
        </div>
        <a href={localizePath(postPath(slug), locale)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold ring-1 ring-gray-200">
          <ExternalLink className="h-3.5 w-3.5" /> View
        </a>
        <Btn variant="outline" size="sm" onClick={retranslate} loading={busy}>
          <RefreshCw className="h-3.5 w-3.5" /> {status === 'missing' ? 'Translate now' : 'Re-translate'}
        </Btn>
        <Btn size="sm" onClick={save} loading={saving}>
          <Save className="h-3.5 w-3.5" /> Save {info.name}
        </Btn>
      </div>
      <Card className="space-y-4 p-5">
        <input value={data.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Title" className="w-full border-0 bg-transparent text-2xl font-extrabold outline-none" />
        <div>
          <label className="admin-label">Excerpt</label>
          <textarea value={data.excerpt || ''} onChange={(e) => set('excerpt', e.target.value)} className="admin-input min-h-[70px]" />
        </div>
      </Card>
      <RichEditor value={data.content || ''} onChange={(v) => set('content', v)} minHeight={460} />
      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <div>
          <label className="admin-label">Category</label>
          <input value={data.category || ''} onChange={(e) => set('category', e.target.value)} className="admin-input" />
        </div>
        <div>
          <label className="admin-label">Meta title</label>
          <input value={data.metaTitle || ''} onChange={(e) => set('metaTitle', e.target.value)} className="admin-input" />
        </div>
        <div className="md:col-span-2">
          <label className="admin-label">Meta description</label>
          <textarea value={data.metaDescription || ''} onChange={(e) => set('metaDescription', e.target.value)} className="admin-input min-h-[60px]" />
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ pages */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v ?? null));

/** Does this field (or anything inside it) hold text to translate? */
function hasText(f: Field, v: any): boolean {
  if (SKIP_FIELDS.has(f.name) || v === undefined || v === null || v === '') return false;
  if (['text', 'textarea', 'lines', 'richtext'].includes(f.type)) return typeof v === 'string' && /\p{L}/u.test(v.replace(/<[^>]+>/g, ''));
  if (f.type === 'link') return !!v?.label;
  if (f.type === 'list') return Array.isArray(v) && v.some((it) => (f.fields || []).some((sf) => hasText(sf, it?.[sf.name])));
  return false;
}

/** One translatable field: the English original above, the language version to edit below */
function TrField({ f, en, value, onChange, dir }: { f: Field; en: any; value: any; onChange: (v: any) => void; dir: 'ltr' | 'rtl' }) {
  if (!hasText(f, en)) return null;
  if (f.type === 'list') {
    const list: any[] = Array.isArray(value) ? value : clone(en);
    return (
      <div className="space-y-3">
        <p className="admin-label !mb-0">{f.label}</p>
        {(en as any[]).map((item, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              {f.itemLabel || 'Item'} {i + 1}
            </p>
            {(f.fields || []).map((sf) => (
              <TrField
                key={sf.name}
                f={sf}
                en={item?.[sf.name]}
                value={list[i]?.[sf.name]}
                dir={dir}
                onChange={(v) => {
                  const next = clone(list.length === en.length ? list : (en as any[]).map((x, k) => list[k] ?? clone(x)));
                  next[i] = { ...(next[i] || clone(item)), [sf.name]: v };
                  onChange(next);
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }
  const enText = f.type === 'link' ? en?.label : en;
  const cur = f.type === 'link' ? value?.label ?? '' : value ?? '';
  const set = (t: string) => onChange(f.type === 'link' ? { ...(value || en || {}), label: t } : t);
  const missing = !cur || cur === enText;
  return (
    <div>
      <label className="admin-label flex items-center gap-2">
        {f.label}
        {missing && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">same as English</span>}
      </label>
      <p className="mb-1.5 line-clamp-3 rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-500" dir="ltr">
        <span className="font-bold text-gray-400">EN · </span>
        {String(enText).replace(/<[^>]+>/g, ' ')}
      </p>
      {f.type === 'richtext' ? (
        <div dir={dir}>
          <RichEditor value={cur} onChange={set} minHeight={160} />
        </div>
      ) : f.type === 'textarea' || f.type === 'lines' || String(enText).length > 90 ? (
        <textarea dir={dir} value={cur} onChange={(e) => set(e.target.value)} className="admin-input min-h-[80px]" />
      ) : (
        <input dir={dir} value={cur} onChange={(e) => set(e.target.value)} className="admin-input" />
      )}
    </div>
  );
}

/** The page in another language: every section's texts side by side with the English original */
export function PageTranslation({ id, slug, locale, blocks, title, metaTitle, metaDescription }: { id: string; slug: string; locale: string; blocks: Block[]; title: string; metaTitle?: string; metaDescription?: string }) {
  const [data, setData] = useState<any>(null);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const info = LOCALES.find((l) => l.code === locale)!;
  const url = localizePath(slug === 'home' ? '/' : `/${slug}`, locale);

  const load = async () => {
    setData(null);
    const d = await api<{ translation: any }>(`/api/admin/translations?entity=page&id=${id}&locale=${locale}&build=1`);
    setData(d.translation?.data || {});
    setStatus(d.translation?.status || 'missing');
    setDirty(false);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, locale]);

  // translated block for an English block (matched by id, then by position)
  const trBlock = (b: Block, i: number) => {
    const list: Block[] = Array.isArray(data?.blocks) ? data.blocks : [];
    return list.find((x) => x?.id === b.id) || (list[i]?.type === b.type ? list[i] : null);
  };
  const setField = (b: Block, i: number, name: string, v: any) => {
    setData((d: any) => {
      const list: Block[] = Array.isArray(d?.blocks) ? clone(d.blocks) : [];
      let k = list.findIndex((x) => x?.id === b.id);
      if (k < 0 && list[i]?.type === b.type) k = i;
      if (k < 0) {
        list.push({ id: b.id, type: b.type, data: {} });
        k = list.length - 1;
      }
      list[k] = { ...list[k], id: b.id, type: b.type, data: { ...(list[k].data || {}), [name]: v } };
      return { ...d, blocks: list };
    });
    setDirty(true);
  };

  async function save() {
    setSaving(true);
    try {
      await api('/api/admin/translations', 'PUT', { entity: 'page', id, locale, data: { title: data.title, metaTitle: data.metaTitle, metaDescription: data.metaDescription, blocks: data.blocks || [] } });
      setStatus('edited');
      setDirty(false);
      toast(`${info.name} page saved — live on the website`);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }
  async function retranslate() {
    if ((status === 'edited' || dirty) && !confirm(`Replace the ${info.name} texts with a fresh translation? Your edits on this language will be lost.`)) return;
    setBusy(true);
    try {
      await api('/api/admin/translations', 'POST', { action: 'entity', entity: 'page', id, locale });
      toast(`${info.name} version updated`);
      await load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <Spinner />;
  const label: Record<string, string> = { missing: 'Not created yet', auto: 'Professional translation', edited: 'Edited by hand', outdated: 'English changed — please check' };
  const sections = blocks.map((b, i) => ({ b, i, schema: BLOCK_MAP[b.type] })).filter(({ b, schema }) => schema && !b.data?.hidden && schema.fields.some((f) => hasText(f, b.data?.[f.name])));

  return (
    <div className="space-y-4">
      <div className="sticky top-[64px] z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-gold/15 p-4 backdrop-blur">
        <span className="text-2xl">{info.flag}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold">
            {info.name} page <span className="font-normal text-gray-500">· {url}</span>
          </p>
          <p className="text-xs text-gray-600">
            {label[status] || status}. Same layout as English — change any text below and click “Save {info.name}”. {dirty && <b className="text-amber-700">Unsaved changes.</b>}
          </p>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold ring-1 ring-gray-200">
          <ExternalLink className="h-3.5 w-3.5" /> View {info.native}
        </a>
        <Btn variant="outline" size="sm" onClick={retranslate} loading={busy}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh translation
        </Btn>
        <Btn size="sm" onClick={save} loading={saving}>
          <Save className="h-3.5 w-3.5" /> Save {info.name}
        </Btn>
      </div>

      <Card className="space-y-4 p-5">
        <TrField f={{ name: 'title', label: 'Page title', type: 'text' }} en={title} value={data.title} dir={info.dir} onChange={(v) => (setData({ ...data, title: v }), setDirty(true))} />
        <TrField f={{ name: 'metaTitle', label: 'Google title', type: 'text' }} en={metaTitle} value={data.metaTitle} dir={info.dir} onChange={(v) => (setData({ ...data, metaTitle: v }), setDirty(true))} />
        <TrField f={{ name: 'metaDescription', label: 'Google description', type: 'textarea' }} en={metaDescription} value={data.metaDescription} dir={info.dir} onChange={(v) => (setData({ ...data, metaDescription: v }), setDirty(true))} />
      </Card>

      {sections.map(({ b, i, schema }) => {
        const t = trBlock(b, i);
        const isOpen = open === b.id;
        return (
          <Card key={b.id} className="overflow-hidden p-0">
            <button type="button" onClick={() => setOpen(isOpen ? null : b.id)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-gray-900">{schema!.label}</span>
                <span className="block truncate text-xs text-gray-500" dir={info.dir}>
                  {String(t?.data?.title || b.data?.title || t?.data?.eyebrow || b.data?.eyebrow || '').replace(/<[^>]+>/g, '')}
                </span>
              </span>
              <ChevronDown className={cn('h-4 w-4 text-gray-400 transition', isOpen && 'rotate-180')} />
            </button>
            {isOpen && (
              <div className="space-y-4 border-t border-gray-100 p-5">
                {schema!.fields.map((f) => (
                  <TrField key={f.name} f={f} en={b.data?.[f.name]} value={t?.data?.[f.name]} dir={info.dir} onChange={(v) => setField(b, i, f.name, v)} />
                ))}
              </div>
            )}
          </Card>
        );
      })}
      <p className="text-center text-xs text-gray-400">
        Pictures, prices, colours and the order of sections come from the English page, so every language always has the same layout.
      </p>
    </div>
  );
}
