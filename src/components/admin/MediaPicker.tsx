'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Search, Check, Trash2, Copy, Image as ImageIcon, Link2 } from 'lucide-react';
import { Modal, Btn, api, toast } from './ui';
import { cn } from '@/lib/utils';

type Media = { id: string; url: string; filename: string; mime?: string; size: number; createdAt: string };

export function useMedia() {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<{ items: Media[] }>(`/api/admin/media?take=120&q=${encodeURIComponent(q)}`);
      setItems(d.items);
    } finally {
      setLoading(false);
    }
  }, [q]);
  return { items, loading, load, q, setQ };
}

export async function uploadFiles(list: FileList | File[]) {
  const fd = new FormData();
  Array.from(list).forEach((f) => fd.append('files', f));
  const d = await api<{ items: Media[] }>('/api/admin/upload', 'POST', fd);
  return d.items;
}

export function MediaGrid({ onSelect, selectable }: { onSelect?: (url: string) => void; selectable?: boolean }) {
  const { items, loading, load, q, setQ } = useMedia();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function up(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    try {
      const added = await uploadFiles(list);
      toast(`${added.length} file(s) uploaded`);
      await load();
      if (selectable && added[0] && onSelect) onSelect(added[0].url);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function del(m: Media) {
    if (!confirm(`Delete ${m.filename}? Pages using it will show a broken image.`)) return;
    await api(`/api/admin/media/${m.id}`, 'DELETE');
    toast('Deleted');
    load();
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        up(e.dataTransfer.files);
      }}
      className={cn('rounded-xl transition', drag && 'ring-2 ring-gold ring-offset-4')}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search files…" className="admin-input pl-9" />
        </div>
        <Btn onClick={() => fileRef.current?.click()} loading={busy}>
          <Upload className="h-4 w-4" /> Upload
        </Btn>
        <input ref={fileRef} type="file" multiple hidden accept="image/*,video/mp4,video/webm,application/pdf" onChange={(e) => up(e.target.files)} />
      </div>
      <p className="mb-3 text-xs text-gray-400">Tip: drag & drop images anywhere here. JPG, PNG, WEBP, SVG, GIF, MP4, PDF — max 15 MB.</p>
      {loading && !items.length ? (
        <p className="py-10 text-center text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">No files yet. Upload your first image.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((m) => (
            <div key={m.id} className="group relative overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200">
              <button type="button" onClick={() => onSelect?.(m.url)} className="block aspect-square w-full">
                {m.mime?.startsWith('image') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.filename} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="grid h-full place-items-center text-xs font-bold text-gray-500">{m.filename.split('.').pop()?.toUpperCase()}</span>
                )}
              </button>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                <span className="truncate text-[0.65rem] text-white/90">{m.filename}</span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.origin + m.url);
                      toast('URL copied', 'info');
                    }}
                    className="rounded bg-white/20 p-1 text-white hover:bg-white/40"
                    title="Copy URL"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => del(m)} className="rounded bg-white/20 p-1 text-white hover:bg-red-500" title="Delete">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              </div>
              {selectable && (
                <span className="pointer-events-none absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-gold text-ink opacity-0 group-hover:opacity-100">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MediaPickerModal({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (url: string) => void }) {
  const [url, setUrl] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Choose an image" wide="xl">
      <div className="mb-5 flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste an image URL (https://)" className="admin-input pl-9" />
        </div>
        <Btn
          variant="dark"
          onClick={() => {
            if (url) {
              onSelect(url);
              onClose();
            }
          }}
        >
          Use URL
        </Btn>
      </div>
      <MediaGrid
        selectable
        onSelect={(u) => {
          onSelect(u);
          onClose();
        }}
      />
    </Modal>
  );
}

export function ImageInput({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => setOpen(true)} className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200 hover:ring-gold">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-6 w-6 text-gray-400" />
        )}
      </button>
      <div className="flex-1 space-y-2">
        <input value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Image URL" className="admin-input text-xs" />
        <div className="flex gap-2">
          <Btn type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
            Choose / upload
          </Btn>
          {value && (
            <Btn type="button" size="sm" variant="danger" onClick={() => onChange('')}>
              Remove
            </Btn>
          )}
        </div>
      </div>
      <MediaPickerModal open={open} onClose={() => setOpen(false)} onSelect={onChange} />
    </div>
  );
}
