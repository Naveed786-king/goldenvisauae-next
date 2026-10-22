'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronUp, Copy, Eye, EyeOff, Plus, Save, Trash2, ExternalLink, Monitor, Smartphone, PanelRightClose, PanelRightOpen, Layers, Search } from 'lucide-react';
import { BLOCKS, BLOCK_MAP, COMMON_FIELDS, STYLE_FIELDS } from '@/components/blocks/schema';
import type { Block } from '@/components/blocks/types';
import { FieldGroup } from './FieldInput';
import { ImageInput } from './MediaPicker';
import { Btn, Card, Modal, api, toast, Toggle } from './ui';
import { cn } from '@/lib/utils';
import { LanguageTabs, PageTranslation } from './TranslationEditor';

type PageData = { id: string; title: string; slug: string; status: string; metaTitle?: string; metaDescription?: string; ogImage?: string; blocks: Block[] };

const uid = () => Math.random().toString(36).slice(2, 10);

export default function PageEditor({ initial }: { initial: PageData }) {
  const [page, setPage] = useState<PageData>(initial);
  // ?lang=ar opens the Arabic version straight away (links from the Pages list)
  const [lang, setLang] = useState('en');
  useEffect(() => {
    const l = new URLSearchParams(window.location.search).get('lang');
    if (l) setLang(l);
  }, []);
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<'content' | 'design' | 'settings'>('content');
  const [lib, setLib] = useState<{ open: boolean; at: number }>({ open: false, at: 0 });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [stamp, setStamp] = useState(Date.now());
  const [libQ, setLibQ] = useState('');
  const dragIdx = useRef<number | null>(null);

  const update = (patch: Partial<PageData>) => {
    setPage((p) => ({ ...p, ...patch }));
    setDirty(true);
  };
  const setBlocks = (blocks: Block[]) => update({ blocks });

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const d = await api<{ item: any }>(`/api/admin/pages/${page.id}`, 'PUT', {
        title: page.title,
        slug: page.slug,
        status: page.status,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        ogImage: page.ogImage,
        blocks: page.blocks,
      });
      setPage((p) => ({ ...p, slug: d.item.slug }));
      setDirty(false);
      setStamp(Date.now());
      toast('Page saved — live on the website');
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }, [page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [save, dirty]);

  function addBlock(type: string) {
    const schema = BLOCK_MAP[type];
    const b: Block = { id: uid(), type, data: JSON.parse(JSON.stringify(schema.defaults || {})) };
    const copy = [...page.blocks];
    copy.splice(lib.at, 0, b);
    setBlocks(copy);
    setLib({ open: false, at: 0 });
    setOpen(b.id);
    setTab('content');
  }

  function move(i: number, to: number) {
    if (to < 0 || to >= page.blocks.length) return;
    const copy = [...page.blocks];
    const [x] = copy.splice(i, 1);
    copy.splice(to, 0, x);
    setBlocks(copy);
  }

  const groups = useMemo(() => {
    const q = libQ.toLowerCase();
    const filtered = BLOCKS.filter((b) => !q || b.label.toLowerCase().includes(q) || b.description.toLowerCase().includes(q));
    return filtered.reduce<Record<string, typeof BLOCKS>>((acc, b) => {
      (acc[b.group] = acc[b.group] || []).push(b);
      return acc;
    }, {});
  }, [libQ]);

  const url = page.slug === 'home' ? '/' : `/${page.slug}`;

  return (
    <div className={cn('grid gap-6', preview && 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
      <div className="min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-3 border-b border-gray-200 bg-gray-50/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
          <Link href="/admin/pages" className="rounded-lg p-2 text-gray-500 hover:bg-white" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-gray-900">{page.title || 'Untitled page'}</p>
            <p className="truncate text-xs text-gray-500">
              {url} · {page.blocks.length} sections {dirty && <span className="ml-1 font-bold text-amber-600">• unsaved changes</span>}
            </p>
          </div>
          <Btn variant="outline" size="sm" onClick={() => setPreview((p) => !p)} className="hidden xl:inline-flex">
            {preview ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />} Live preview
          </Btn>
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-600 ring-1 ring-gray-300 bg-white hover:bg-gray-50">
            <ExternalLink className="h-4 w-4" /> View
          </a>
          <Btn onClick={save} loading={saving}>
            <Save className="h-4 w-4" /> Save
          </Btn>
        </div>

        <div className="mb-5">
          <LanguageTabs entity="page" entityId={page.id} value={lang} onChange={(l) => {
            if (l !== 'en' && dirty && !confirm('Save the English page first? Unsaved English changes are not shown in other languages.')) return;
            setLang(l);
          }} />
        </div>

        {lang !== 'en' ? (
          <PageTranslation id={page.id} slug={page.slug} locale={lang} blocks={page.blocks} title={page.title} metaTitle={page.metaTitle} metaDescription={page.metaDescription} />
        ) : (
        <>
        {/* Page settings */}
        <Card className="mb-6 p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_160px]">
            <div>
              <label className="admin-label">Page title (admin & browser tab)</label>
              <input className="admin-input" value={page.title} onChange={(e) => update({ title: e.target.value })} />
            </div>
            <div>
              <label className="admin-label">URL slug</label>
              <div className="flex items-center rounded-[10px] ring-1 ring-gray-200 focus-within:ring-gold bg-white">
                <span className="pl-3 text-sm text-gray-400">/</span>
                <input className="w-full bg-transparent px-1 py-2 text-sm outline-none disabled:text-gray-400" value={page.slug} disabled={initial.slug === 'home'} onChange={(e) => update({ slug: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="admin-label">Status</label>
              <select className="admin-input" value={page.status} onChange={(e) => update({ status: e.target.value })}>
                <option value="published">Published</option>
                <option value="draft">Draft (hidden)</option>
              </select>
            </div>
          </div>
          <details className="group mt-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-gray-700">
              <Search className="h-4 w-4 text-gold-deep" /> SEO settings (Google title, description, share image)
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="mt-4 grid gap-4">
              <div>
                <label className="admin-label">
                  Meta title <span className="font-normal text-gray-400">({(page.metaTitle || '').length}/60)</span>
                </label>
                <input className="admin-input" value={page.metaTitle || ''} onChange={(e) => update({ metaTitle: e.target.value })} />
              </div>
              <div>
                <label className="admin-label">
                  Meta description <span className="font-normal text-gray-400">({(page.metaDescription || '').length}/160)</span>
                </label>
                <textarea className="admin-input min-h-[70px]" value={page.metaDescription || ''} onChange={(e) => update({ metaDescription: e.target.value })} />
              </div>
              <div>
                <label className="admin-label">Social share image</label>
                <ImageInput value={page.ogImage} onChange={(v) => update({ ogImage: v })} />
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-400">Google preview</p>
                <p className="mt-1 truncate text-[1.05rem] text-[#1a0dab]">{page.metaTitle || page.title}</p>
                <p className="truncate text-xs text-[#006621]">
                  {process.env.NEXT_PUBLIC_SITE_URL || 'https://yoursite.com'}
                  {url}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{page.metaDescription || 'Add a meta description to control how this page appears in Google.'}</p>
              </div>
            </div>
          </details>
        </Card>

        {/* Blocks */}
        <div className="space-y-3">
          <InsertBar onClick={() => setLib({ open: true, at: 0 })} />
          {page.blocks.map((b, i) => {
            const schema = BLOCK_MAP[b.type];
            const isOpen = open === b.id;
            const hidden = !!b.data?.hidden;
            return (
              <div key={b.id}>
                <div
                  draggable={!isOpen}
                  onDragStart={() => (dragIdx.current = i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIdx.current !== null && dragIdx.current !== i) move(dragIdx.current, i);
                    dragIdx.current = null;
                  }}
                  className={cn('overflow-hidden rounded-2xl bg-white ring-1 transition', isOpen ? 'ring-gold shadow-lg' : 'ring-gray-200 hover:ring-gray-300', hidden && 'opacity-60')}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="grid h-9 w-9 shrink-0 cursor-grab place-items-center rounded-lg bg-ink text-xs font-extrabold text-gold">{i + 1}</span>
                    <button type="button" onClick={() => setOpen(isOpen ? null : b.id)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-bold text-gray-900">{b.data?.title || b.data?.eyebrow || schema?.label || b.type}</p>
                      <p className="truncate text-xs text-gray-500">
                        {schema?.label || b.type}
                        {hidden && ' · hidden'}
                      </p>
                    </button>
                    <div className="flex items-center gap-0.5">
                      <IconBtn title="Move up" onClick={() => move(i, i - 1)}><ChevronUp className="h-4 w-4" /></IconBtn>
                      <IconBtn title="Move down" onClick={() => move(i, i + 1)}><ChevronDown className="h-4 w-4" /></IconBtn>
                      <IconBtn
                        title={hidden ? 'Show' : 'Hide'}
                        onClick={() => {
                          const copy = [...page.blocks];
                          copy[i] = { ...b, data: { ...b.data, hidden: !hidden } };
                          setBlocks(copy);
                        }}
                      >
                        {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </IconBtn>
                      <IconBtn
                        title="Duplicate"
                        onClick={() => {
                          const copy = [...page.blocks];
                          copy.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(b)), id: uid() });
                          setBlocks(copy);
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn
                        title="Delete"
                        danger
                        onClick={() => {
                          if (confirm(`Delete the "${schema?.label}" section?`)) setBlocks(page.blocks.filter((x) => x.id !== b.id));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </div>
                  </div>
                  {isOpen && schema && (
                    <div className="border-t border-gray-100">
                      <div className="flex gap-1 border-b border-gray-100 px-4">
                        {(['content', 'design', 'settings'] as const).map((t) => (
                          <button key={t} onClick={() => setTab(t)} className={cn('border-b-2 px-3 py-2.5 text-xs font-bold capitalize', tab === t ? 'border-gold text-gray-900' : 'border-transparent text-gray-500')}>
                            {t === 'content' ? 'Content' : t === 'design' ? '🎨 Design' : 'Section settings'}
                          </button>
                        ))}
                      </div>
                      <div className="p-5">
                        {tab === 'design' ? (
                          <>
                            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-gold/10 px-4 py-3 text-xs text-gray-600">
                              <span>Style this section: colours, fonts, spacing, glass boxes and animation. Empty = website default (Admin → Design).</span>
                              <button
                                type="button"
                                className="shrink-0 font-bold text-red-600 hover:underline"
                                onClick={() => {
                                  if (!confirm('Reset all design settings of this section?')) return;
                                  const copy = [...page.blocks];
                                  copy[i] = { ...b, data: { ...b.data, style: {} } };
                                  setBlocks(copy);
                                }}
                              >
                                Reset
                              </button>
                            </div>
                            <FieldGroup
                              fields={STYLE_FIELDS}
                              data={b.data?.style || {}}
                              onChange={(st) => {
                                const copy = [...page.blocks];
                                copy[i] = { ...b, data: { ...b.data, style: st } };
                                setBlocks(copy);
                              }}
                            />
                          </>
                        ) : (
                          <FieldGroup
                            fields={tab === 'content' ? schema.fields : COMMON_FIELDS}
                            data={b.data}
                            onChange={(d) => {
                              const copy = [...page.blocks];
                              copy[i] = { ...b, data: d };
                              setBlocks(copy);
                            }}
                          />
                        )}
                        <p className="mt-5 text-xs text-gray-400">Link tips: use <code>/page-slug</code>, a full URL, or the words <code>whatsapp</code>, <code>phone</code> or <code>email</code> to use your contact details from Settings.</p>
                      </div>
                    </div>
                  )}
                </div>
                <InsertBar onClick={() => setLib({ open: true, at: i + 1 })} />
              </div>
            );
          })}
          {page.blocks.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
              <Layers className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">This page is empty. Add your first section.</p>
              <Btn className="mt-4" onClick={() => setLib({ open: true, at: 0 })}>
                <Plus className="h-4 w-4" /> Add section
              </Btn>
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {preview && (
        <div className="hidden xl:block">
          <div className="sticky top-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Live preview {dirty && '(save to refresh)'}</p>
              <div className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-gray-200">
                <button onClick={() => setDevice('desktop')} className={cn('rounded-md p-1.5', device === 'desktop' ? 'bg-ink text-white' : 'text-gray-500')} aria-label="Desktop"><Monitor className="h-4 w-4" /></button>
                <button onClick={() => setDevice('mobile')} className={cn('rounded-md p-1.5', device === 'mobile' ? 'bg-ink text-white' : 'text-gray-500')} aria-label="Mobile"><Smartphone className="h-4 w-4" /></button>
              </div>
            </div>
            <div className={cn('mx-auto overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 shadow-xl', device === 'mobile' ? 'w-[390px] max-w-full' : 'w-full')}>
              <iframe key={stamp} src={`${url}${url.includes('?') ? '&' : '?'}_preview=${stamp}`} className="h-[calc(100vh-110px)] w-full" title="Preview" />
            </div>
          </div>
        </div>
      )}

      <Modal open={lib.open} onClose={() => setLib({ open: false, at: 0 })} title="Add a section" wide>
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input autoFocus value={libQ} onChange={(e) => setLibQ(e.target.value)} placeholder="Search sections…" className="admin-input pl-9" />
        </div>
        <div className="space-y-6">
          {Object.entries(groups).map(([g, list]) => (
            <div key={g}>
              <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-gray-400">{g}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map((b) => (
                  <button key={b.type} onClick={() => addBlock(b.type)} className="rounded-xl p-4 text-left ring-1 ring-gray-200 transition hover:bg-gold/5 hover:ring-gold">
                    <p className="text-sm font-bold text-gray-900">{b.label}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{b.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function IconBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  return (
    <button type="button" title={title} onClick={onClick} className={cn('rounded-lg p-1.5 text-gray-400 transition', danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-gray-100 hover:text-gray-700')}>
      {children}
    </button>
  );
}

function InsertBar({ onClick }: { onClick: () => void }) {
  return (
    <div className="group relative flex h-5 items-center justify-center">
      <div className="absolute inset-x-0 h-px bg-transparent transition group-hover:bg-gold/50" />
      <button onClick={onClick} className="relative z-10 inline-flex items-center gap-1 rounded-full bg-white px-3 py-0.5 text-[0.7rem] font-bold text-gray-400 opacity-0 ring-1 ring-gray-200 transition group-hover:opacity-100 hover:text-gold-deep hover:ring-gold">
        <Plus className="h-3 w-3" /> Add section here
      </button>
    </div>
  );
}
