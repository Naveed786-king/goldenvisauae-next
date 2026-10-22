'use client';
import { LOCALES, localizePath } from '@/lib/i18n/config';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, ExternalLink, Copy, Trash2, House, FileText, Search } from 'lucide-react';
import { Btn, Card, Modal, PageTitle, api, toast, Empty } from './ui';
import { formatDateTime, slugify } from '@/lib/utils';

export default function PagesList() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<{ title: string; slug: string; from: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await api<{ items: any[] }>(`/api/admin/pages?take=200&q=${encodeURIComponent(q)}`);
    setRows(d.items.sort((a, b) => (a.slug === 'home' ? -1 : b.slug === 'home' ? 1 : 0)));
    setLoading(false);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  async function create() {
    if (!creating?.title) return toast('Enter a title', 'error');
    setBusy(true);
    try {
      let blocks: any[] = [
        { id: Math.random().toString(36).slice(2, 10), type: 'pageHeader', data: { theme: 'dark', title: creating.title, subtitle: '' } },
        { id: Math.random().toString(36).slice(2, 10), type: 'richtext', data: { theme: 'light', width: 'narrow', content: '<p>Start writing your content here…</p>' } },
      ];
      if (creating.from) {
        const src = rows.find((r) => r.id === creating.from);
        if (src) blocks = JSON.parse(src.blocks || '[]').map((b: any) => ({ ...b, id: Math.random().toString(36).slice(2, 10) }));
      }
      const d = await api<{ item: any }>('/api/admin/pages', 'POST', { title: creating.title, slug: creating.slug || slugify(creating.title), status: 'draft', blocks });
      toast('Page created (as draft)');
      router.push(`/admin/pages/${d.item.id}`);
    } catch (e: any) {
      toast(e.message, 'error');
      setBusy(false);
    }
  }

  async function duplicate(p: any) {
    try {
      const d = await api<{ item: any }>('/api/admin/pages', 'POST', {
        title: `${p.title} (copy)`,
        slug: `${p.slug === 'home' ? 'home-copy' : p.slug + '-copy'}-${Date.now().toString(36).slice(-4)}`,
        status: 'draft',
        blocks: p.blocks,
        metaTitle: p.metaTitle,
        metaDescription: p.metaDescription,
      });
      toast('Duplicated');
      router.push(`/admin/pages/${d.item.id}`);
    } catch (e: any) {
      toast(e.message, 'error');
    }
  }

  async function remove(p: any) {
    if (!confirm(`Delete page "${p.title}"?`)) return;
    try {
      await api(`/api/admin/pages/${p.id}`, 'DELETE');
      toast('Page deleted');
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  }

  return (
    <div>
      <PageTitle
        title="Pages"
        subtitle="Build every page with drag-and-drop sections. Changes go live as soon as you save."
        actions={
          <Btn onClick={() => setCreating({ title: '', slug: '', from: '' })}>
            <Plus className="h-4 w-4" /> New page
          </Btn>
        }
      />
      <Card>
        <div className="border-b border-gray-100 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages…" className="admin-input pl-9" />
          </div>
        </div>
        <ul className="divide-y divide-gray-50">
          {rows.map((p) => {
            const count = (() => {
              try {
                return JSON.parse(p.blocks || '[]').length;
              } catch {
                return 0;
              }
            })();
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-4 px-4 py-3.5 hover:bg-gray-50/70">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold/15 text-gold-deep">{p.slug === 'home' ? <House className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</span>
                <Link href={`/admin/pages/${p.id}`} className="min-w-0 flex-1">
                  <p className="truncate font-bold text-gray-900">
                    {p.title}{' '}
                    {p.status === 'draft' && <span className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-gray-600">Draft</span>}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    /{p.slug === 'home' ? '' : p.slug} · {count} sections · updated {formatDateTime(p.updatedAt)}
                  </p>
                </Link>
                {/* every page exists in every language: open / edit each version */}
                <div className="order-last flex w-full flex-wrap gap-1 pl-14 xl:order-none xl:w-auto xl:pl-0">
                  {LOCALES.map((l) => (
                    <Link
                      key={l.code}
                      href={l.code === 'en' ? `/admin/pages/${p.id}` : `/admin/pages/${p.id}?lang=${l.code}`}
                      title={`Edit the ${l.name} page — ${localizePath(p.slug === 'home' ? '/' : `/${p.slug}`, l.code)}`}
                      className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-1 text-[10.5px] font-bold text-gray-600 hover:bg-gold/20 hover:text-ink"
                    >
                      <span>{l.flag}</span>
                      {l.code.toUpperCase()}
                    </Link>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Link href={`/admin/pages/${p.id}`} className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-ink-2">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                  <a href={p.slug === 'home' ? '/' : `/${p.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="View">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button onClick={() => duplicate(p)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Duplicate">
                    <Copy className="h-4 w-4" />
                  </button>
                  {p.slug !== 'home' && (
                    <button onClick={() => remove(p)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {!loading && rows.length === 0 && <Empty text="No pages found." />}
      </Card>

      <Modal
        open={!!creating}
        onClose={() => setCreating(null)}
        title="Create a new page"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setCreating(null)}>Cancel</Btn>
            <Btn onClick={create} loading={busy}>Create page</Btn>
          </>
        }
      >
        {creating && (
          <div className="grid gap-4">
            <div>
              <label className="admin-label">Page title</label>
              <input autoFocus className="admin-input" value={creating.title} onChange={(e) => setCreating({ ...creating, title: e.target.value, slug: slugify(e.target.value) })} />
            </div>
            <div>
              <label className="admin-label">URL slug</label>
              <input className="admin-input" value={creating.slug} onChange={(e) => setCreating({ ...creating, slug: e.target.value })} />
              <p className="mt-1 text-xs text-gray-400">Your page will be at /{creating.slug || 'your-slug'}</p>
            </div>
            <div>
              <label className="admin-label">Start from</label>
              <select className="admin-input" value={creating.from} onChange={(e) => setCreating({ ...creating, from: e.target.value })}>
                <option value="">Blank page (header + text)</option>
                {rows.map((r) => (
                  <option key={r.id} value={r.id}>
                    Copy design of: {r.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
