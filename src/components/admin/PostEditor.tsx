'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, ExternalLink, Trash2, Languages, CircleCheck, CircleAlert, Loader2 } from 'lucide-react';
import { LOCALES } from '@/lib/i18n/config';
import { cn, postPath } from '@/lib/utils';
import RichEditor from './RichEditor';
import { ImageInput } from './MediaPicker';
import { Btn, Card, api, toast } from './ui';
import { slugify } from '@/lib/utils';
import { LanguageTabs, PostTranslation } from './TranslationEditor';

export default function PostEditor({ initial }: { initial: any }) {
  const router = useRouter();
  // <input type="datetime-local"> works in the browser's local time
  const toLocalInput = (v?: string) => {
    const d = v ? new Date(v) : new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const [p, setP] = useState<any>({ ...initial, publishedAt: toLocalInput(initial.publishedAt) });
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!initial.id);
  const [lang, setLang] = useState('en');
  const set = (k: string, v: any) => setP((x: any) => ({ ...x, [k]: v }));

  // Publish → the post is translated into every website language right away (progress shown below)
  const [tr, setTr] = useState<Record<string, 'wait' | 'busy' | 'done' | 'error'>>({});
  const [trError, setTrError] = useState('');
  const [enabled, setEnabled] = useState<string[]>(LOCALES.map((l) => l.code));
  useEffect(() => {
    api<{ value: any }>('/api/admin/settings/translation')
      .then((d) => Array.isArray(d.value?.enabled) && setEnabled(d.value.enabled))
      .catch(() => {});
  }, []);
  const targets = LOCALES.filter((l) => l.code !== 'en' && enabled.includes(l.code)).map((l) => l.code);
  const translating = Object.values(tr).some((v) => v === 'wait' || v === 'busy');

  async function translateAll(id: string) {
    setTrError('');
    setTr(Object.fromEntries(targets.map((l) => [l, 'wait'])));
    let firstError = '';
    const queue = [...targets];
    const worker = async () => {
      while (queue.length) {
        const locale = queue.shift()!;
        setTr((x) => ({ ...x, [locale]: 'busy' }));
        try {
          await api('/api/admin/translations', 'POST', { action: 'entity', entity: 'post', id, locale, force: false, requireEngine: true });
          setTr((x) => ({ ...x, [locale]: 'done' }));
        } catch (e: any) {
          firstError ||= e.message;
          setTr((x) => ({ ...x, [locale]: 'error' }));
          // no / wrong API key: every language would fail the same way
          if (/API key|turned off/i.test(e.message)) {
            queue.forEach((l) => setTr((x) => ({ ...x, [l]: 'error' })));
            queue.length = 0;
          }
        }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker(), worker()]);
    if (firstError) {
      setTrError(firstError);
      toast('Some languages were not translated: ' + firstError, 'error');
    } else toast(`Published and translated into ${targets.length} languages ✔`);
  }

  async function save() {
    if (!p.title) return toast('Title is required', 'error');
    setSaving(true);
    try {
      const body = { ...p, slug: p.slug || slugify(p.title), publishedAt: new Date(p.publishedAt).toISOString() };
      const live = body.status === 'published';
      const q = live && targets.length ? '?translate=editor' : '';
      let id = p.id;
      if (p.id) {
        await api(`/api/admin/posts/${p.id}${q}`, 'PUT', body);
        toast(live ? 'Post saved — translating into all languages…' : 'Draft saved');
      } else {
        const d = await api<{ item: any }>(`/api/admin/posts${q}`, 'POST', body);
        id = d.item.id;
        setP((x: any) => ({ ...x, id, slug: d.item.slug }));
        toast(live ? 'Post published — translating into all languages…' : 'Draft saved');
      }
      setSaving(false);
      if (live && targets.length) await translateAll(id);
      if (!p.id) router.replace(`/admin/posts/${id}`);
      else router.refresh();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Delete this post?')) return;
    await api(`/api/admin/posts/${p.id}`, 'DELETE');
    toast('Deleted');
    router.push('/admin/posts');
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin/posts" className="rounded-lg p-2 text-gray-500 hover:bg-white" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-2xl font-extrabold">{p.id ? 'Edit post' : 'New post'}</h1>
        {p.id && (
          <>
            <a href={postPath(p.slug)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-bold text-gray-600 ring-1 ring-gray-300">
              <ExternalLink className="h-4 w-4" /> View
            </a>
            <Btn variant="danger" onClick={remove}>
              <Trash2 className="h-4 w-4" />
            </Btn>
          </>
        )}
        <Btn onClick={save} loading={saving || translating}>
          <Save className="h-4 w-4" /> {translating ? 'Translating…' : p.status === 'draft' ? 'Save draft' : p.id ? 'Save & update translations' : 'Publish'}
        </Btn>
      </div>
      {Object.keys(tr).length > 0 && (
        <Card className="mb-5 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 flex items-center gap-1.5 text-sm font-bold">
              <Languages className="h-4 w-4 text-gold-deep" /> {translating ? 'Translating with AI…' : trError ? 'Translation finished with errors' : 'Live in every language'}
            </span>
            {targets.map((code) => {
              const l = LOCALES.find((x) => x.code === code)!;
              const st = tr[code];
              return (
                <span key={code} className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ring-1', st === 'done' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : st === 'error' ? 'bg-red-50 text-red-700 ring-red-200' : st === 'busy' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-gray-50 text-gray-400 ring-gray-200')}>
                  {l.flag} {code.toUpperCase()}
                  {st === 'done' ? <CircleCheck className="h-3.5 w-3.5" /> : st === 'error' ? <CircleAlert className="h-3.5 w-3.5" /> : st === 'busy' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                </span>
              );
            })}
          </div>
          {trError && (
            <p className="mt-2 text-xs text-red-600">
              {trError} — <Link href="/admin/languages" className="font-bold underline">open Languages settings</Link>
            </p>
          )}
        </Card>
      )}
      <div className="mb-5">
        <LanguageTabs entityId={p.id} value={lang} onChange={setLang} />
        {!p.id && <p className="mt-2 text-xs text-gray-500">Publish the post first — it is then translated automatically into all languages.</p>}
      </div>
      {lang !== 'en' && p.id ? (
        <PostTranslation id={p.id} slug={p.slug} locale={lang} />
      ) : (
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5 min-w-0">
          <Card className="p-5 space-y-4">
            <input
              value={p.title}
              onChange={(e) => {
                set('title', e.target.value);
                if (autoSlug) set('slug', slugify(e.target.value));
              }}
              placeholder="Post title"
              className="w-full border-0 bg-transparent text-2xl md:text-3xl font-extrabold outline-none placeholder:text-gray-300"
            />
            <div className="flex items-center rounded-[10px] ring-1 ring-gray-200 bg-gray-50">
              <span className="pl-3 text-xs text-gray-400">yoursite.com/</span>
              <input
                value={p.slug}
                onChange={(e) => {
                  setAutoSlug(false);
                  set('slug', e.target.value);
                }}
                className="w-full bg-transparent px-1 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="admin-label">Excerpt (shown on blog cards)</label>
              <textarea value={p.excerpt || ''} onChange={(e) => set('excerpt', e.target.value)} className="admin-input min-h-[70px]" />
            </div>
          </Card>
          <RichEditor value={p.content} onChange={(v) => set('content', v)} minHeight={520} />
        </div>
        <div className="space-y-5">
          <Card title="Publish" className="p-0">
            <div className="space-y-4 p-5">
              <div>
                <label className="admin-label">Status</label>
                <select className="admin-input" value={p.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div>
                <label className="admin-label">Publish date</label>
                <input type="datetime-local" className="admin-input" value={p.publishedAt} onChange={(e) => set('publishedAt', e.target.value)} />
              </div>
              <div>
                <label className="admin-label">Author</label>
                <input className="admin-input" value={p.author || ''} onChange={(e) => set('author', e.target.value)} />
              </div>
            </div>
          </Card>
          <Card title="Cover image" className="p-0">
            <div className="p-5">
              <ImageInput value={p.cover} onChange={(v) => set('cover', v)} />
            </div>
          </Card>
          <Card title="Organise" className="p-0">
            <div className="space-y-4 p-5">
              <div>
                <label className="admin-label">Category</label>
                <input className="admin-input" value={p.category || ''} onChange={(e) => set('category', e.target.value)} />
              </div>
              <div>
                <label className="admin-label">Tags (comma separated)</label>
                <input className="admin-input" value={p.tags || ''} onChange={(e) => set('tags', e.target.value)} />
              </div>
            </div>
          </Card>
          <Card title="SEO" className="p-0">
            <div className="space-y-4 p-5">
              <div>
                <label className="admin-label">Meta title ({(p.metaTitle || '').length}/60)</label>
                <input className="admin-input" value={p.metaTitle || ''} onChange={(e) => set('metaTitle', e.target.value)} />
              </div>
              <div>
                <label className="admin-label">Meta description ({(p.metaDescription || '').length}/160)</label>
                <textarea className="admin-input min-h-[80px]" value={p.metaDescription || ''} onChange={(e) => set('metaDescription', e.target.value)} />
              </div>
            </div>
          </Card>
        </div>
      </div>
      )}
    </div>
  );
}
