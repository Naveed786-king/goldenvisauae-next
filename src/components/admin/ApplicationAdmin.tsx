'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Send, Trash2, Save } from 'lucide-react';
import { StatusBadge } from '@/components/ui/Status';
import FileAdmin, { ClientDetails, PortalAccess, NotifyLogCard } from './FileAdmin';
import { SocialIcon } from '@/components/ui/Icon';
import { Btn, Card, Spinner, api, toast } from './ui';
import { cn, formatDateTime } from '@/lib/utils';

export default function ApplicationAdmin({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const router = useRouter();
  const [app, setApp] = useState<any>(null);
  const [form, setForm] = useState<{ status: string; progress: number; adminNote: string; notify: boolean }>({ status: '', progress: 0, adminNote: '', notify: true });
  const [msg, setMsg] = useState('');
  const [emailMsg, setEmailMsg] = useState(true);
  const [saving, setSaving] = useState(false);
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
      await api(`/api/admin/applications/${id}`, 'PUT', { adminNote: form.adminNote });
      toast('Note saved');
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

  async function clearChat() {
    if (!confirm(`Delete all ${app.messages.length} messages in this file? The client will no longer see them.`)) return;
    try {
      await api(`/api/admin/applications/${id}/file`, 'POST', { action: 'clearMessages' });
      toast('Chat cleared');
      load();
    } catch (e: any) {
      toast(e.message, 'error');
    }
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
      {(() => {
        const steps = app.steps || [];
        const ci = Math.max(0, steps.findIndex((x: any) => x.current));
        const paid = (app.payments || []).filter((p: any) => p.status === 'paid').reduce((t: number, p: any) => t + p.amount, 0);
        const due = (app.payments || []).filter((p: any) => p.status !== 'paid').reduce((t: number, p: any) => t + p.amount, 0);
        const money = (n: number) => `AED ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const link: string = app.links?.file || '';
        const wa = `https://wa.me/${String(app.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${app.fullName}, you can follow your file ${app.refNo} here: ${link}`)}`;
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-gray-400">
                  <Link href="/admin/applications" className="hover:text-gray-700">Applications</Link> / {app.refNo}
                </p>
                <h1 className="font-display text-3xl font-semibold text-gray-900">{app.fullName} · {app.service}</h1>
              </div>
              <StatusBadge status={app.status} className="text-sm" />
              {isAdmin && (
                <Btn variant="danger" onClick={delApp}>
                  <Trash2 className="h-4 w-4" />
                </Btn>
              )}
            </div>
            <div className="inline-flex flex-wrap items-center gap-2 rounded-xl bg-[#fbf4dd] px-3 py-2 ring-1 ring-[#efe0a8]">
              <span className="text-[0.68rem] font-extrabold uppercase tracking-wider text-[#8a6a14]">Service selected</span>
              <b className="text-sm text-gray-900">{app.service}</b>
              <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-[0.68rem] font-bold text-[#f2d27a]">{steps.length} steps</span>
              {app.familyMembers > 0 && <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-[0.68rem] font-bold text-[#f2d27a]">{app.familyMembers + 1} people</span>}
            </div>
            <p className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              Opened {formatDateTime(app.createdAt)} · updated {formatDateTime(app.updatedAt)}
              {due > 0 ? <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700">Due {money(due)}</span> : paid > 0 ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">Paid {money(paid)}</span> : null}
              {steps.length > 0 && <span className="rounded-full bg-[#fbf4dd] px-2 py-0.5 font-bold text-[#8a6a14]">Step {ci + 1} of {steps.length}: {steps[ci]?.name}</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {app.phone && <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-gradient-to-b from-[#e8c766] to-[#c9a032] px-4 py-2 text-sm font-bold text-[#1a1406]">Send portal link on WhatsApp</a>}
              <button type="button" onClick={() => { navigator.clipboard?.writeText(link); toast('Link copied'); }} className="rounded-xl bg-white px-4 py-2 text-sm font-bold ring-1 ring-gray-200">Copy portal link</button>
              <a href={link} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-white px-4 py-2 text-sm font-bold ring-1 ring-gray-200">Open client view ↗</a>
            </div>
          </div>
        );
      })()}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6 min-w-0">
          <FileAdmin app={app} reload={load} />


        </div>

        <div className="space-y-6">
          <Card
            title="Messages"
            actions={
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-emerald-600"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live</span>
                {app.messages.length > 0 && (
                  <button type="button" onClick={clearChat} className="rounded-xl bg-white px-2.5 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-100 hover:bg-red-50">Clear chat</button>
                )}
                {app.phone && (
                  <a href={`https://wa.me/${String(app.phone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${String(app.fullName || '').split(' ')[0]}, `)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-[#25D366] px-2.5 py-1.5 text-xs font-bold text-white">
                    <SocialIcon name="whatsapp" className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
              </span>
            }
            className="p-0 overflow-hidden"
          >
            <div ref={chatRef} className="h-[420px] space-y-3 overflow-y-auto bg-gray-50 p-5 thin-scroll">
              {app.messages.length === 0 && <p className="py-12 text-center text-sm text-gray-400">No messages yet.</p>}
              {app.messages.map((m: any) => (
                <div key={m.id} className={cn('flex', m.fromAdmin ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm', m.fromAdmin ? 'bg-ink text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm ring-1 ring-gray-200')}>
                    <p className={cn('mb-0.5 text-[0.65rem] font-bold uppercase tracking-wider', m.fromAdmin ? 'text-gold' : 'text-gray-400')}>{m.fromAdmin ? m.sender?.name || 'Team' : app.fullName}</p>
                    <p className="whitespace-pre-line">{m.body}</p>
                    <p className={cn('mt-1 text-[0.65rem]', m.fromAdmin ? 'text-white/40' : 'text-gray-400')}>{formatDateTime(m.createdAt)}{m.channel === 'whatsapp' ? ' · via WhatsApp' : ''}</p>
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
                <input type="checkbox" checked={emailMsg} onChange={(e) => setEmailMsg(e.target.checked)} className="accent-[var(--brand-gold)]" /> Also send by email and WhatsApp
              </label>
            </form>
          </Card>
          <ClientDetails key={app.id} app={app} reload={load} />
          <PortalAccess app={app} reload={load} isAdmin={isAdmin} />
          <Card title="Note for the client (shown at the top of their file)" className="p-0">
            <div className="space-y-3 p-5">
              <textarea className="admin-input min-h-[70px]" value={form.adminNote} onChange={(e) => setForm({ ...form, adminNote: e.target.value })} placeholder="e.g. Please upload a clear copy of your passport and title deed." />
              <div className="flex justify-end">
                <Btn onClick={save} loading={saving}>
                  <Save className="h-4 w-4" /> Save note
                </Btn>
              </div>
            </div>
          </Card>
          <NotifyLogCard log={app.log} />
        </div>
      </div>
    </div>
  );
}
