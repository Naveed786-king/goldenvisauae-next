'use client';
import { useState } from 'react';
import { LoaderCircle, Check } from 'lucide-react';

export default function ProfileForms({ user }: { user: { name: string; email: string; phone: string; nationality: string } }) {
  const [p, setP] = useState(user);
  const [pw, setPw] = useState({ current: '', password: '' });
  const [msg, setMsg] = useState<{ a?: string; b?: string; err?: string }>({});
  const [busy, setBusy] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy('a');
    const r = await fetch('/api/account/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    const d = await r.json();
    setMsg(r.ok ? { a: 'Profile saved' } : { err: d.error });
    setBusy('');
  }
  async function change(e: React.FormEvent) {
    e.preventDefault();
    setBusy('b');
    const r = await fetch('/api/account/password', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pw) });
    const d = await r.json();
    setMsg(r.ok ? { b: 'Password changed' } : { err: d.error });
    if (r.ok) setPw({ current: '', password: '' });
    setBusy('');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={save} className="rounded-[2rem] bg-white p-7 ring-1 ring-ink/5 space-y-4">
        <h2 className="font-display text-3xl font-semibold text-ink">Profile</h2>
        <input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Full name" className="field" required />
        <input value={p.email} disabled className="field opacity-60" />
        <input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} placeholder="Phone" className="field" />
        <input value={p.nationality} onChange={(e) => setP({ ...p, nationality: e.target.value })} placeholder="Nationality" className="field" />
        <button className="btn btn-gold" disabled={busy === 'a'}>{busy === 'a' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save profile</button>
        {msg.a && <p className="text-sm text-emerald-600">{msg.a}</p>}
      </form>
      <form onSubmit={change} className="rounded-[2rem] bg-white p-7 ring-1 ring-ink/5 space-y-4">
        <h2 className="font-display text-3xl font-semibold text-ink">Change password</h2>
        <input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} placeholder="Current password" className="field" required />
        <input type="password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} placeholder="New password (min 8)" minLength={8} className="field" required />
        <button className="btn btn-dark" disabled={busy === 'b'}>{busy === 'b' && <LoaderCircle className="h-4 w-4 animate-spin" />} Update password</button>
        {msg.b && <p className="text-sm text-emerald-600">{msg.b}</p>}
        {msg.err && <p className="text-sm text-red-600">{msg.err}</p>}
      </form>
    </div>
  );
}
