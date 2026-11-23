'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Card, api, toast } from './ui';

/** Open a client file from the admin (the Abu Dhabi "New application" form). */
export default function NewApplication({ services }: { services: string[] }) {
  const router = useRouter();
  const [f, setF] = useState({ name: '', phone: '', email: '', nationality: '', service: services[0] || '', location: 'in', adults: '0', kids: '0', language: 'English', notes: '', notify: true });
  const [busy, setBusy] = useState(false);
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const create = async () => {
    setBusy(true);
    try {
      const r = await api<{ id: string }>('/api/admin/applications', 'POST', f);
      toast('Client file opened');
      router.push(`/admin/applications/${r.id}`);
    } catch (e: any) {
      toast(e.message, 'error');
      setBusy(false);
    }
  };
  const F = ({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) => (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="admin-label">{label}</label>
      {children}
    </div>
  );
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-gray-400">New application</p>
        <h1 className="font-display text-3xl font-semibold text-gray-900">Open a <span className="text-[#b8862f]">client file.</span></h1>
      </div>
      <Card className="max-w-3xl p-0">
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {F({ label: 'Client name', children: <input className="admin-input" value={f.name} onChange={up('name')} required /> })}
          {F({ label: 'WhatsApp number', children: <input className="admin-input" type="tel" value={f.phone} onChange={up('phone')} placeholder="+971" /> })}
          {F({ label: 'Email', children: <input className="admin-input" type="email" value={f.email} onChange={up('email')} /> })}
          {F({ label: 'Nationality', children: <input className="admin-input" value={f.nationality} onChange={up('nationality')} /> })}
          {F({ label: 'Route', children: <select className="admin-input" value={f.service} onChange={up('service')}>{services.map((x) => <option key={x}>{x}</option>)}</select> })}
          {F({ label: 'Where is the client?', children: <select className="admin-input" value={f.location} onChange={up('location')}><option value="in">Inside the UAE</option><option value="out">Outside the UAE</option></select> })}
          {F({ label: 'Adult family members', children: <input className="admin-input" type="number" min={0} max={10} value={f.adults} onChange={up('adults')} /> })}
          {F({ label: 'Children under 18', children: <input className="admin-input" type="number" min={0} max={10} value={f.kids} onChange={up('kids')} /> })}
          {F({ label: 'Preferred language', children: <input className="admin-input" value={f.language} onChange={up('language')} /> })}
          {F({ label: 'Private notes', full: true, children: <textarea className="admin-input min-h-[80px]" value={f.notes} onChange={up('notes')} /> })}
          <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
            <input type="checkbox" className="h-4 w-4 accent-[#b8862f]" checked={f.notify} onChange={(e) => setF({ ...f, notify: e.target.checked })} /> Send the client the welcome message with their file link (WhatsApp and email)
          </label>
          <div className="md:col-span-2">
            <Btn loading={busy} onClick={create}>Create application</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
