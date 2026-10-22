'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Upload, FileText, LoaderCircle, Download, Check, Circle } from 'lucide-react';
import { APPLICATION_STATUSES } from '@/lib/defaults';
import { StatusBadge, Progress } from '@/components/ui/Status';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

const FLOW = ['submitted', 'under_review', 'processing', 'initial_approval', 'medical_biometrics', 'approved', 'completed'];

export default function ApplicationDetail({ id }: { id: string }) {
  const [app, setApp] = useState<any>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    const r = await fetch(`/api/account/applications/${id}`, { cache: 'no-store' });
    const d = await r.json();
    if (!r.ok) return setError(d.error || 'Could not load application');
    setApp(d.application);
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const n = app?.messages?.length || 0;
    if (n !== lastCount.current && chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    lastCount.current = n;
  }, [app?.messages?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim()) return;
    setSending(true);
    await fetch(`/api/account/applications/${id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: msg }) });
    setMsg('');
    setSending(false);
    load();
  }

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(list).forEach((f) => fd.append('files', f));
    const r = await fetch(`/api/account/applications/${id}/documents`, { method: 'POST', body: fd });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      alert(d.error || 'Upload failed');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    load();
  }

  if (error) return <p className="rounded-2xl bg-white p-8 text-center text-red-600">{error}</p>;
  if (!app) return <div className="grid place-items-center py-24"><LoaderCircle className="h-8 w-8 animate-spin text-gold" /></div>;

  const currentIdx = FLOW.indexOf(app.status);
  const terminalBad = ['rejected', 'cancelled'].includes(app.status);

  return (
    <div className="space-y-6">
      <Link href="/account" className="inline-flex items-center gap-2 text-sm font-bold text-ink/60 hover:text-gold-deep"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>

      <div className="rounded-[2rem] bg-white p-6 md:p-8 ring-1 ring-ink/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm font-bold text-ink/50">{app.refNo}</p>
            <h2 className="mt-1 font-display text-3xl md:text-4xl font-semibold text-ink">{app.service}</h2>
            <p className="mt-1 text-sm text-ink/50">Submitted {formatDate(app.createdAt)} · Last update {formatDateTime(app.updatedAt)}</p>
          </div>
          <StatusBadge status={app.status} className="text-sm px-3 py-1.5" />
        </div>
        <div className="mt-6">
          <div className="flex justify-between text-xs font-bold text-ink/50 mb-2"><span>Overall progress</span><span>{app.progress}%</span></div>
          <Progress value={app.progress} className="h-3" />
        </div>
        {app.adminNote && (
          <div className="mt-6 rounded-2xl border-l-4 border-gold bg-sand p-5">
            <p className="text-xs font-extrabold uppercase tracking-wider text-gold-deep">Note from your consultant</p>
            <p className="mt-1 text-sm text-ink/80 whitespace-pre-line">{app.adminNote}</p>
          </div>
        )}

        {!terminalBad && (
          <ol className="mt-8 grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {FLOW.map((s, i) => {
              const info = APPLICATION_STATUSES.find((x) => x.value === s)!;
              const done = currentIdx >= i;
              return (
                <li key={s} className={cn('relative rounded-2xl p-3 text-center ring-1', done ? 'bg-gold/10 ring-gold/40' : 'ring-ink/5')}>
                  <span className={cn('mx-auto grid h-8 w-8 place-items-center rounded-full', done ? 'bg-gold text-ink' : 'bg-ink/5 text-ink/30')}>
                    {done ? <Check className="h-4 w-4" strokeWidth={3} /> : <Circle className="h-3 w-3" />}
                  </span>
                  <p className={cn('mt-2 text-[0.7rem] font-bold leading-tight', done ? 'text-ink' : 'text-ink/40')}>{info.label}</p>
                </li>
              );
            })}
          </ol>
        )}
        {app.status === 'documents_required' && (
          <p className="mt-6 rounded-2xl bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">Action needed: please upload the requested documents below.</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Chat */}
        <div className="flex flex-col rounded-[2rem] bg-white ring-1 ring-ink/5 overflow-hidden h-[560px]">
          <div className="flex items-center justify-between border-b border-ink/5 px-6 py-4">
            <h3 className="font-bold text-ink">Messages with your consultant</h3>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live</span>
          </div>
          <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto thin-scroll bg-sand/40 p-5">
            {app.messages.length === 0 && <p className="py-10 text-center text-sm text-ink/45">No messages yet. Ask us anything about your application.</p>}
            {app.messages.map((m: any) => (
              <div key={m.id} className={cn('flex', m.fromAdmin ? 'justify-start' : 'justify-end')}>
                <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm', m.fromAdmin ? 'bg-white text-ink rounded-bl-sm' : 'bg-ink text-white rounded-br-sm')}>
                  {m.fromAdmin && <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-gold-deep mb-0.5">Consultant</p>}
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className={cn('mt-1 text-[0.65rem]', m.fromAdmin ? 'text-ink/40' : 'text-white/45')}>{formatDateTime(m.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-ink/5 p-3">
            <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type your message…" className="field !py-3" />
            <button disabled={sending} className="btn btn-gold !px-4" aria-label="Send">
              {sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>

        {/* Docs + details */}
        <div className="space-y-6">
          <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink/5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink">Documents</h3>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn btn-dark btn-sm">
                {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
              </button>
              <input ref={fileRef} type="file" multiple hidden accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx" onChange={(e) => upload(e.target.files)} />
            </div>
            <ul className="mt-4 space-y-2">
              {app.documents.length === 0 && <li className="text-sm text-ink/45">No documents uploaded yet.</li>}
              {app.documents.map((d: any) => (
                <li key={d.id}>
                  <a href={`/api/files/${d.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl bg-sand/70 px-4 py-3 text-sm hover:bg-sand">
                    <FileText className="h-4 w-4 shrink-0 text-gold-deep" />
                    <span className="flex-1 truncate">{d.name}</span>
                    {d.uploadedBy === 'admin' && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[0.6rem] font-bold text-gold-deep">FROM US</span>}
                    <Download className="h-4 w-4 text-ink/40" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[2rem] bg-white p-6 ring-1 ring-ink/5">
            <h3 className="font-bold text-ink">Application details</h3>
            <dl className="mt-4 divide-y divide-ink/5 text-sm">
              {[
                ['Full name', app.fullName],
                ['Email', app.email],
                ['Phone', app.phone],
                ['Nationality', app.nationality],
                ['Passport no.', app.passportNo],
                ['Date of birth', app.dateOfBirth],
                ['Property value', app.propertyValue],
                ['Family members', app.familyMembers],
              ]
                .filter(([, v]) => v !== null && v !== '' && v !== undefined)
                .map(([k, v]) => (
                  <div key={k as string} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-ink/50">{k}</dt>
                    <dd className="font-semibold text-ink text-right">{String(v)}</dd>
                  </div>
                ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
