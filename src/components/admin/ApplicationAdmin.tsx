'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Upload, FileText, Trash2, Save, Mail, Phone, LoaderCircle } from 'lucide-react';
import { APPLICATION_STATUSES } from '@/lib/defaults';
import { StatusBadge, Progress } from '@/components/ui/Status';
import { SocialIcon } from '@/components/ui/Icon';
import { Btn, Card, Spinner, api, toast, Toggle } from './ui';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

export default function ApplicationAdmin({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const router = useRouter();
  const [app, setApp] = useState<any>(null);
  const [form, setForm] = useState<{ status: string; progress: number; adminNote: string; notify: boolean }>({ status: '', progress: 0, adminNote: '', notify: true });
  const [msg, setMsg] = useState('');
  const [emailMsg, setEmailMsg] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  const load = useCallback(async () => {
    const d = await api<{ application: any }>(`/api/admin/applications/${id}`);
    setApp(d.application);
    if (!loaded.current) {
      setForm({ status: d.application.status, progress: d.application.progress, adminNote: d.application.adminNote || '', notify: true });
      loaded.current = true;
    }
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [app?.messages?.length]);

  async function save() {
    setSaving(true);
    try {
      await api(`/api/admin/applications/${id}`, 'PUT', form);
      toast('Application updated' + (form.notify && form.status !== app.status ? ' — client notified' : ''));
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!msg.trim()) return;
    await api(`/api/admin/applications/${id}/messages`, 'POST', { body: msg, email: emailMsg });
    setMsg('');
    load();
  }

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(list).forEach((f) => fd.append('files', f));
    try {
      await api(`/api/admin/applications/${id}/documents`, 'POST', fd);
      toast('Document shared with client');
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function delDoc(docId: string) {
    if (!confirm('Delete this document?')) return;
    await api(`/api/admin/applications/${id}/documents?doc=${docId}`, 'DELETE');
    load();
  }

  async function delApp() {
    if (!confirm('Delete this application and all its documents & messages?')) return;
    await api(`/api/admin/applications/${id}`, 'DELETE');
    toast('Application deleted');
    router.push('/admin/applications');
  }

  if (!app) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/applications" className="rounded-lg p-2 text-gray-500 hover:bg-white" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs font-bold text-gray-400">{app.refNo}</p>
          <h1 className="truncate text-2xl font-extrabold">{app.fullName}</h1>
        </div>
        <StatusBadge status={app.status} className="text-sm" />
        {isAdmin && (
          <Btn variant="danger" onClick={delApp}>
            <Trash2 className="h-4 w-4" />
          </Btn>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6 min-w-0">
          <Card title="Update status" className="p-0">
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <label className="admin-label">Status</label>
                <select
                  className="admin-input"
                  value={form.status}
                  onChange={(e) => {
                    const s = APPLICATION_STATUSES.find((x) => x.value === e.target.value)!;
                    setForm({ ...form, status: s.value, progress: s.progress });
                  }}
                >
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="admin-label">Progress: {form.progress}%</label>
                <input type="range" min={0} max={100} step={5} value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} className="mt-3 w-full accent-[var(--brand-gold)]" />
              </div>
              <div className="md:col-span-2">
                <label className="admin-label">Note for the client (shown in their portal)</label>
                <textarea className="admin-input min-h-[80px]" value={form.adminNote} onChange={(e) => setForm({ ...form, adminNote: e.target.value })} placeholder="e.g. Please upload a clear copy of your passport and Oqood." />
              </div>
              <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3">
                <Toggle checked={form.notify} onChange={(v) => setForm({ ...form, notify: v })} label="Email the client when status changes" />
                <Btn onClick={save} loading={saving}>
                  <Save className="h-4 w-4" /> Save changes
                </Btn>
              </div>
            </div>
            <div className="px-5 pb-5">
              <Progress value={app.progress} />
            </div>
          </Card>

          <Card title="Conversation" actions={<span className="flex items-center gap-1.5 text-xs text-emerald-600"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live</span>} className="p-0 overflow-hidden">
            <div ref={chatRef} className="h-[420px] space-y-3 overflow-y-auto bg-gray-50 p-5 thin-scroll">
              {app.messages.length === 0 && <p className="py-12 text-center text-sm text-gray-400">No messages yet.</p>}
              {app.messages.map((m: any) => (
                <div key={m.id} className={cn('flex', m.fromAdmin ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm', m.fromAdmin ? 'bg-ink text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm ring-1 ring-gray-200')}>
                    <p className={cn('mb-0.5 text-[0.65rem] font-bold uppercase tracking-wider', m.fromAdmin ? 'text-gold' : 'text-gray-400')}>{m.fromAdmin ? m.sender?.name || 'Team' : app.fullName}</p>
                    <p className="whitespace-pre-line">{m.body}</p>
                    <p className={cn('mt-1 text-[0.65rem]', m.fromAdmin ? 'text-white/40' : 'text-gray-400')}>{formatDateTime(m.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={send} className="border-t border-gray-100 p-3">
              <div className="flex gap-2">
                <textarea
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(e as any);
                    }
                  }}
                  rows={2}
                  placeholder="Write a message to the client… (Enter to send)"
                  className="admin-input resize-none"
                />
                <Btn type="submit" className="self-stretch">
                  <Send className="h-4 w-4" />
                </Btn>
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <input type="checkbox" checked={emailMsg} onChange={(e) => setEmailMsg(e.target.checked)} className="accent-[var(--brand-gold)]" /> Also send by email
              </label>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Client" className="p-0">
            <div className="p-5 text-sm">
              <p className="font-bold">{app.user?.name}</p>
              <p className="text-gray-500">{app.user?.email}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {app.phone && (
                  <a href={`https://wa.me/${String(app.phone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white">
                    <SocialIcon name="whatsapp" className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
                {app.phone && (
                  <a href={`tel:${app.phone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700">
                    <Phone className="h-3.5 w-3.5" /> Call
                  </a>
                )}
                {app.email && (
                  <a href={`mailto:${app.email}`} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </a>
                )}
              </div>
            </div>
          </Card>
          <Card title="Application details" className="p-0">
            <dl className="divide-y divide-gray-50 px-5 py-2 text-sm">
              {[
                ['Service', app.service],
                ['Submitted', formatDate(app.createdAt)],
                ['Phone', app.phone],
                ['Email', app.email],
                ['Nationality', app.nationality],
                ['Passport no.', app.passportNo],
                ['Date of birth', app.dateOfBirth],
                ['Property value', app.propertyValue],
                ['Family members', String(app.familyMembers)],
                ['Notes', app.notes],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-gray-400">{k}</dt>
                    <dd className="text-right font-semibold whitespace-pre-line">{v}</dd>
                  </div>
                ))}
            </dl>
          </Card>
          <Card
            title={`Documents (${app.documents.length})`}
            actions={
              <>
                <Btn size="sm" variant="dark" onClick={() => fileRef.current?.click()} loading={uploading}>
                  <Upload className="h-3.5 w-3.5" /> Share file
                </Btn>
                <input ref={fileRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
              </>
            }
            className="p-0"
          >
            <ul className="space-y-1.5 p-4">
              {app.documents.length === 0 && <li className="py-4 text-center text-sm text-gray-400">No documents yet.</li>}
              {app.documents.map((d: any) => (
                <li key={d.id} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-gold-deep" />
                  <a href={`/api/files/${d.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 truncate font-medium hover:text-gold-deep">
                    {d.name}
                  </a>
                  <span className={cn('rounded px-1.5 py-0.5 text-[0.6rem] font-bold', d.uploadedBy === 'admin' ? 'bg-ink text-gold' : 'bg-blue-100 text-blue-700')}>{d.uploadedBy === 'admin' ? 'US' : 'CLIENT'}</span>
                  <button onClick={() => delDoc(d.id)} className="text-gray-300 hover:text-red-600" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
