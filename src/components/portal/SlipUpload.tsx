'use client';
import { useRef, useState } from 'react';
import { LoaderCircle, Upload, Check } from 'lucide-react';

/** Bank transfer: upload the transfer slip (PDF or photo) */
export default function SlipUpload({ token, pid, sent }: { token: string; pid: string; sent: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(sent);
  const [err, setErr] = useState('');
  async function upload(f?: File) {
    if (!f) return;
    setBusy(true);
    setErr('');
    const fd = new FormData();
    fd.append('file', f);
    const r = await fetch(`/api/portal/${token}/slip/${pid}`, { method: 'POST', body: fd });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(d.error || 'Upload failed');
    setDone(true);
  }
  return (
    <div className="mt-5">
      {done && <p className="mb-3 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><Check className="h-4 w-4" /> Slip received. We will confirm your payment after checking it.</p>}
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="btn btn-dark btn-sm">
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {done ? 'Upload another slip' : 'Upload transfer slip'}
      </button>
      <input ref={ref} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" onChange={(e) => upload(e.target.files?.[0])} />
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
