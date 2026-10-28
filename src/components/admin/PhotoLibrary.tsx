'use client';
// Admin → Auto Publisher → Photo library: photos the picture AI uses as inspiration.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Images, Search, Sparkles, Trash2, Upload } from 'lucide-react';
import { Btn, Card, Empty, Spinner, Toggle, api, confirmDialog, toast } from './ui';

type Ref = { id: string; url: string; caption: string; tags: string; active: boolean; uses: number; createdAt: string };

const BATCH = 3; // photos per upload request (keeps each request small)

async function send(method: 'PATCH', body: unknown) {
  const r = await fetch('/api/admin/autopublisher/references', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d;
}

export default function PhotoLibraryTab() {
  const [items, setItems] = useState<Ref[] | null>(null);
  const [q, setQ] = useState('');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<{ items: Ref[] }>('/api/admin/autopublisher/references');
      setItems(d.items);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not load the photo library', 'error');
    }
  }, []);
  useEffect(() => {
    load();
    // descriptions arrive in the background: refresh while some are missing
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  async function upload(files: File[]) {
    const photos = files.filter((f) => f.type.startsWith('image/'));
    if (!photos.length) return toast('Choose photos (JPG, PNG, WebP or HEIC)', 'error');
    setProgress({ done: 0, total: photos.length });
    const problems: string[] = [];
    for (let i = 0; i < photos.length; i += BATCH) {
      const fd = new FormData();
      photos.slice(i, i + BATCH).forEach((f) => fd.append('files', f));
      try {
        const r = await fetch('/api/admin/autopublisher/references', { method: 'POST', body: fd });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) problems.push(d.error || `Upload failed (${r.status})`);
        else problems.push(...(d.skipped || []));
      } catch (e) {
        problems.push(e instanceof Error ? e.message : 'Upload failed');
      }
      setProgress({ done: Math.min(photos.length, i + BATCH), total: photos.length });
    }
    setProgress(null);
    await load();
    if (problems.length) toast(`Some photos were skipped: ${problems.slice(0, 3).join(' · ')}${problems.length > 3 ? ` (+${problems.length - 3} more)` : ''}`, 'error');
    else toast(`${photos.length} photo(s) added. The AI is describing them now.`);
  }

  async function update(id: string, data: Partial<Ref>) {
    try {
      const d = await send('PATCH', { id, ...data });
      setItems((list) => list?.map((r) => (r.id === id ? d.item : r)) || null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save', 'error');
    }
  }

  async function remove(id: string) {
    if (!confirmDialog('Remove this photo from the library? (The file stays in Media.)')) return;
    try {
      await api(`/api/admin/autopublisher/references?id=${encodeURIComponent(id)}`, 'DELETE');
      setItems((list) => list?.filter((r) => r.id !== id) || null);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not remove', 'error');
    }
  }

  async function describeNow() {
    try {
      await api('/api/admin/autopublisher/references', 'POST', { action: 'describe' });
      toast('Describing the waiting photos — this takes a few seconds per photo.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not start', 'error');
    }
  }

  if (!items) return <Spinner />;
  const needle = q.trim().toLowerCase();
  const shown = needle ? items.filter((r) => `${r.caption} ${r.tags} ${r.url}`.toLowerCase().includes(needle)) : items;
  const waiting = items.filter((r) => !r.caption).length;

  return (
    <div className="space-y-6">
      <Card title={<span className="flex items-center gap-2"><Images className="h-4 w-4" /> Photo library</span>}>
        <div className="space-y-4 p-5">
          <p className="text-sm leading-relaxed text-gray-600">
            Upload real photos you like (your office, Dubai, families, airports, homes — 120 or more is great). For every article picture the publisher picks the photo that fits the title best and asks the picture AI to make a <b>new</b> photo in the same style and kind of scene. Your photos are never published as they are.
          </p>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              upload(Array.from(e.dataTransfer.files));
            }}
            className={`grid place-items-center rounded-2xl border-2 border-dashed p-8 text-center transition ${drag ? 'border-gold bg-gold/5' : 'border-gray-200 bg-gray-50'}`}
          >
            <Upload className="mb-2 h-7 w-7 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">Drag photos here, or</p>
            <Btn size="sm" variant="dark" className="mt-2" onClick={() => input.current?.click()} disabled={!!progress}>
              Choose photos
            </Btn>
            <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && upload(Array.from(e.target.files)).finally(() => (e.target.value = ''))} />
            <p className="mt-2 text-xs text-gray-500">JPG, PNG, WebP or HEIC. Large photos are resized to 1600 px automatically.</p>
            {progress && (
              <div className="mt-4 w-full max-w-sm">
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Uploading {progress.done} / {progress.total}
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">{items.length} photos</span>
            <span className="text-gray-500">{items.length - waiting} described{waiting ? `, ${waiting} waiting` : ''}</span>
            {waiting > 0 && (
              <Btn size="sm" variant="outline" onClick={describeNow}>
                <Sparkles className="h-3.5 w-3.5" /> Describe now
              </Btn>
            )}
            <div className="relative ms-auto">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input className="admin-input !ps-9" placeholder="Search descriptions…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      {!shown.length ? (
        <Empty text={items.length ? 'No photo matches your search.' : 'No photos yet. Upload some above.'} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((r) => (
            <div key={r.id} className={`overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 ${r.active ? '' : 'opacity-60'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.url} alt={r.caption || 'Library photo'} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-2 p-3">
                <textarea
                  rows={3}
                  className="admin-input text-xs"
                  defaultValue={r.caption}
                  placeholder="Waiting for the AI description…"
                  onBlur={(e) => e.target.value.trim() !== r.caption && update(r.id, { caption: e.target.value })}
                />
                <input className="admin-input text-xs" defaultValue={r.tags} placeholder="keywords, comma separated" onBlur={(e) => e.target.value.trim() !== r.tags && update(r.id, { tags: e.target.value })} />
                <div className="flex items-center justify-between gap-2">
                  <Toggle checked={r.active} onChange={(v) => update(r.id, { active: v })} label={r.active ? 'Used' : 'Off'} />
                  <span className="text-[0.7rem] text-gray-400">used {r.uses}×</span>
                  <button type="button" onClick={() => remove(r.id)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove photo">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
