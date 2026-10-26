'use client';
import { Coin } from '@/components/site/Logo';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Sparkles,
  LayoutDashboard,
  FileText,
  Newspaper,
  BadgeCheck,
  CircleHelp,
  MessageSquareQuote,
  Building,
  Image as ImageIcon,
  PanelTop,
  PanelBottom,
  Settings,
  Inbox,
  FolderKanban,
  Users,
  Mail,
  ShieldCheck,
  CircleUser,
  Bell,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Crown,
  Languages,
  Calculator,
  Megaphone,
  Palette,
  DatabaseBackup,
} from 'lucide-react';
import { Toaster, toast } from './ui';
import { cn, formatDateTime } from '@/lib/utils';

type Counts = { newLeads: number; newApps: number; unreadMsgs: number; latestLeads: any[]; latestApps: any[]; latestMsgs: any[] };

const NAV = [
  { group: '', items: [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    group: 'CRM',
    items: [
      { href: '/admin/leads', label: 'Leads & enquiries', icon: Inbox, badge: 'newLeads' },
      { href: '/admin/applications', label: 'Applications', icon: FolderKanban, badge: 'apps' },
      { href: '/admin/customers', label: 'Customers', icon: Users },
      { href: '/admin/subscribers', label: 'Subscribers', icon: Mail },
    ],
  },
  {
    group: 'Website content',
    items: [
      { href: '/admin/pages', label: 'Pages', icon: FileText },
      { href: '/admin/posts', label: 'Blog posts', icon: Newspaper },
      { href: '/admin/autopublisher', label: 'Auto Publisher', icon: Sparkles, adminOnly: true },
      { href: '/admin/services', label: 'Services & prices', icon: BadgeCheck },
      { href: '/admin/calculator', label: 'Cost calculator', icon: Calculator },
      { href: '/admin/offer', label: 'Offer pop-up', icon: Megaphone },
      { href: '/admin/faqs', label: 'FAQs', icon: CircleHelp },
      { href: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
      { href: '/admin/partners', label: 'Partner logos', icon: Building },
      { href: '/admin/media', label: 'Media library', icon: ImageIcon },
    ],
  },
  {
    group: 'Appearance',
    items: [
      { href: '/admin/design', label: 'Design & style', icon: Palette, adminOnly: true },
      { href: '/admin/header', label: 'Header & menu', icon: PanelTop },
      { href: '/admin/footer', label: 'Footer', icon: PanelBottom },
      { href: '/admin/languages', label: 'Languages', icon: Languages },
      { href: '/admin/settings', label: 'Site settings', icon: Settings, adminOnly: true },
      { href: '/admin/backup', label: 'Backup & move', icon: DatabaseBackup, adminOnly: true },
    ],
  },
  {
    group: 'Account',
    items: [
      { href: '/admin/users', label: 'Admin users', icon: ShieldCheck, adminOnly: true },
      { href: '/admin/profile', label: 'My profile', icon: CircleUser },
    ],
  },
];

function beep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  } catch {}
}

export default function AdminShell({ user, siteName, children }: { user: { name: string; email: string; role: string }; siteName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobile, setMobile] = useState(false);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [bell, setBell] = useState(false);
  const prev = useRef<{ l: number; a: number; m: number } | null>(null);

  useEffect(() => setMobile(false), [pathname]);

  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const r = await fetch('/api/admin/notifications', { cache: 'no-store' });
        if (!r.ok) return;
        const d: Counts = await r.json();
        if (stop) return;
        const p = prev.current;
        if (p) {
          if (d.newLeads > p.l) {
            toast(`🔔 New enquiry from ${d.latestLeads[0]?.name || 'a visitor'}`, 'info');
            beep();
          }
          if (d.newApps > p.a) {
            toast(`📁 Application update: ${d.latestApps[0]?.refNo || ''}`, 'info');
            beep();
          }
          if (d.unreadMsgs > p.m) {
            toast(`💬 New message from ${d.latestMsgs[0]?.application?.fullName || 'a client'}`, 'info');
            beep();
          }
        }
        prev.current = { l: d.newLeads, a: d.newApps, m: d.unreadMsgs };
        setCounts(d);
      } catch {}
    }
    poll();
    const t = setInterval(poll, 10000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const total = (counts?.newLeads || 0) + (counts?.newApps || 0) + (counts?.unreadMsgs || 0);
    document.title = `${total ? `(${total}) ` : ''}Admin · ${siteName}`;
  }, [counts, siteName]);

  const badge = (k?: string) => {
    if (!k || !counts) return 0;
    if (k === 'newLeads') return counts.newLeads;
    if (k === 'apps') return counts.newApps + counts.unreadMsgs;
    return 0;
  };
  const totalBell = (counts?.newLeads || 0) + (counts?.newApps || 0) + (counts?.unreadMsgs || 0);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  const isActive = (href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));

  const sidebar = (
    <div className="admin-side flex h-full flex-col text-gray-900">
      <div className="flex items-center gap-3 px-5 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Coin eager className="h-11 w-11 shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">{siteName}</p>
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-gold-deep">Admin panel</p>
        </div>
      </div>
      <nav className="thin-scroll flex-1 overflow-y-auto px-3 pb-6">
        {NAV.map((g) => {
          const items = g.items.filter((i: any) => !i.adminOnly || user.role === 'ADMIN');
          if (!items.length) return null;
          return (
            <div key={g.group} className="mt-4">
              {g.group && <p className="mb-1.5 px-3 text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-gray-400">{g.group}</p>}
              {items.map((i: any) => {
                const n = badge(i.badge);
                return (
                  <Link key={i.href} href={i.href} className={cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.85rem] font-semibold transition', isActive(i.href) ? 'admin-nav-on' : 'admin-nav text-gray-600 hover:text-gray-900')}>
                    <i.icon className="h-[18px] w-[18px]" />
                    <span className="flex-1">{i.label}</span>
                    {n > 0 && <span className={cn('rounded-full px-2 py-0.5 text-[0.65rem] font-extrabold', isActive(i.href) ? 'bg-white text-gold-deep' : 'bg-red-500 text-white')}>{n}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-[#efe4cb] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-[#2a1d05]" style={{ background: 'var(--gold-grad)' }}>{user.name.charAt(0)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="truncate text-[0.7rem] text-gray-500">{user.role === 'ADMIN' ? 'Administrator' : 'Editor'}</p>
          </div>
          <button onClick={logout} className="rounded-lg p-2 text-gray-400 hover:bg-[#fbf5e6] hover:text-gray-900" title="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-bg min-h-screen text-gray-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      <AnimatePresence>
        {mobile && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobile(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="absolute inset-y-0 left-0 w-64">
              {sidebar}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="admin-top backdrop-blur-xl sticky top-0 z-30 flex h-16 items-center gap-3 px-4 md:px-8">
          <button onClick={() => setMobile(true)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live
          </span>
          <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100">
            <ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">View website</span>
          </a>
          <div className="relative">
            <button onClick={() => setBell(!bell)} className="relative rounded-xl p-2.5 text-gray-600 hover:bg-gray-100" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {totalBell > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[0.6rem] font-bold text-white">{totalBell}</span>}
            </button>
            <AnimatePresence>
              {bell && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="absolute right-0 mt-2 w-[min(340px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <p className="text-sm font-bold">Notifications</p>
                    <button onClick={() => setBell(false)} className="text-gray-400 hover:text-gray-700">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto thin-scroll">
                    {!totalBell && <p className="px-4 py-10 text-center text-sm text-gray-400">You are all caught up ✨</p>}
                    {counts?.latestLeads.map((l) => (
                      <Link key={l.id} href="/admin/leads" onClick={() => setBell(false)} className="flex gap-3 border-b border-gray-50 px-4 py-3 hover:bg-gray-50">
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-100 text-blue-600"><Inbox className="h-4 w-4" /></span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">New enquiry: {l.name}</span>
                          <span className="block truncate text-xs text-gray-500">{l.service || 'General'} · {formatDateTime(l.createdAt)}</span>
                        </span>
                      </Link>
                    ))}
                    {counts?.latestApps.map((a) => (
                      <Link key={a.id} href={`/admin/applications/${a.id}`} onClick={() => setBell(false)} className="flex gap-3 border-b border-gray-50 px-4 py-3 hover:bg-gray-50">
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600"><FolderKanban className="h-4 w-4" /></span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{a.refNo} · {a.fullName}</span>
                          <span className="block truncate text-xs text-gray-500">{a.service}</span>
                        </span>
                      </Link>
                    ))}
                    {counts?.latestMsgs.map((m) => (
                      <Link key={m.id} href={`/admin/applications/${m.applicationId}`} onClick={() => setBell(false)} className="flex gap-3 border-b border-gray-50 px-4 py-3 hover:bg-gray-50">
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600"><Mail className="h-4 w-4" /></span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">{m.application?.fullName}: message</span>
                          <span className="block truncate text-xs text-gray-500">{m.body}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>
        <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
