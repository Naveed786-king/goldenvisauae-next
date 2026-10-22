import Link from 'next/link';
import { Inbox, FolderKanban, Users, Newspaper, ArrowRight, FileText, Settings, PanelTop, Eye, TrendingUp } from 'lucide-react';
import { prisma } from '@/lib/db';
import { APPLICATION_STATUSES } from '@/lib/defaults';
import { StatusBadge, LeadBadge } from '@/components/ui/Status';
import { formatDateTime } from '@/lib/utils';
import AutoRefresh from '@/components/portal/AutoRefresh';

export default async function Dashboard() {
  const since = new Date(Date.now() - 13 * 24 * 3600 * 1000);
  since.setHours(0, 0, 0, 0);
  const [leadCount, newLeads, appCount, activeApps, customers, posts, recentLeads, recentApps, leadsRange, appsByStatus, topPosts] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: 'new' } }),
    prisma.application.count(),
    prisma.application.count({ where: { status: { notIn: ['completed', 'rejected', 'cancelled'] } } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.post.count(),
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.application.findMany({ orderBy: { updatedAt: 'desc' }, take: 6 }),
    prisma.lead.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.post.findMany({ orderBy: { views: 'desc' }, take: 5, select: { id: true, title: true, views: true, slug: true } }),
  ]);

  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(since.getTime() + i * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    return { key, label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), count: leadsRange.filter((l) => l.createdAt.toISOString().slice(0, 10) === key).length };
  });
  const max = Math.max(1, ...days.map((d) => d.count));

  const cards = [
    { label: 'Total leads', value: leadCount, sub: `${newLeads} new`, icon: Inbox, href: '/admin/leads', color: 'from-blue-500 to-blue-600' },
    { label: 'Applications', value: appCount, sub: `${activeApps} in progress`, icon: FolderKanban, href: '/admin/applications', color: 'from-amber-500 to-orange-500' },
    { label: 'Customers', value: customers, sub: 'registered clients', icon: Users, href: '/admin/customers', color: 'from-emerald-500 to-teal-500' },
    { label: 'Blog posts', value: posts, sub: 'published articles', icon: Newspaper, href: '/admin/posts', color: 'from-violet-500 to-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={30} />
      <div className="relative overflow-hidden rounded-3xl bg-ink p-7 md:p-9 text-white">
        <div className="absolute inset-0 bg-pattern opacity-[0.07]" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gold/25 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Dashboard</p>
            <h1 className="mt-2 text-3xl font-extrabold">Welcome back 👋</h1>
            <p className="mt-1 text-sm text-white/60">Here is what is happening with your website today.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/pages" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/20"><FileText className="h-4 w-4" /> Edit pages</Link>
            <Link href="/admin/header" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/20"><PanelTop className="h-4 w-4" /> Menu</Link>
            <Link href="/admin/settings" className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-ink hover:brightness-105"><Settings className="h-4 w-4" /> Settings</Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="group rounded-2xl bg-white p-5 ring-1 ring-gray-200/70 transition hover:shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{c.label}</p>
                <p className="mt-2 text-3xl font-extrabold text-gray-900">{c.value}</p>
                <p className="mt-1 text-xs text-gray-500">{c.sub}</p>
              </div>
              <span className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${c.color} text-white shadow-lg`}>
                <c.icon className="h-5 w-5" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-2xl bg-white p-5 ring-1 ring-gray-200/70">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold"><TrendingUp className="h-4 w-4 text-gold-deep" /> Leads — last 14 days</h3>
            <span className="text-xs text-gray-400">{leadsRange.length} total</span>
          </div>
          <div className="mt-6 flex h-48 items-end gap-1.5">
            {days.map((d) => (
              <div key={d.key} className="group relative flex flex-1 flex-col items-center justify-end h-full">
                <span className="mb-1 text-[0.65rem] font-bold text-gray-500 opacity-0 group-hover:opacity-100">{d.count}</span>
                <div className="w-full rounded-t-md bg-gradient-to-t from-gold-deep to-gold-light transition-all group-hover:brightness-110" style={{ height: `${Math.max(3, (d.count / max) * 100)}%` }} />
                <span className="mt-2 text-[0.6rem] text-gray-400 rotate-[-35deg] origin-top-left whitespace-nowrap hidden md:block">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-200/70">
          <h3 className="text-sm font-bold">Applications by status</h3>
          <div className="mt-5 space-y-3">
            {APPLICATION_STATUSES.map((s) => {
              const n = appsByStatus.find((x) => x.status === s.value)?._count._all || 0;
              if (!n) return null;
              return (
                <div key={s.value}>
                  <div className="flex justify-between text-xs"><span className="font-semibold text-gray-600">{s.label}</span><span className="font-bold">{n}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100"><div className="h-full rounded-full bg-gold" style={{ width: `${(n / Math.max(1, appCount)) * 100}%` }} /></div>
                </div>
              );
            })}
            {appCount === 0 && <p className="py-8 text-center text-sm text-gray-400">No applications yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl bg-white ring-1 ring-gray-200/70">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <h3 className="text-sm font-bold">Latest leads</h3>
            <Link href="/admin/leads" className="flex items-center gap-1 text-xs font-bold text-gold-deep">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {recentLeads.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">{l.name.charAt(0)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{l.name} {!l.seen && <span className="ml-1 rounded bg-red-500 px-1.5 text-[0.6rem] font-bold text-white">NEW</span>}</p>
                  <p className="truncate text-xs text-gray-500">{l.service || 'General enquiry'} · {formatDateTime(l.createdAt)}</p>
                </div>
                <LeadBadge status={l.status} />
              </li>
            ))}
            {recentLeads.length === 0 && <li className="px-5 py-10 text-center text-sm text-gray-400">No leads yet.</li>}
          </ul>
        </div>
        <div className="rounded-2xl bg-white ring-1 ring-gray-200/70">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <h3 className="text-sm font-bold">Recent applications</h3>
            <Link href="/admin/applications" className="flex items-center gap-1 text-xs font-bold text-gold-deep">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <ul className="divide-y divide-gray-50">
            {recentApps.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/applications/${a.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.fullName} <span className="font-mono text-xs text-gray-400">{a.refNo}</span></p>
                    <p className="truncate text-xs text-gray-500">{a.service}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
            {recentApps.length === 0 && <li className="px-5 py-10 text-center text-sm text-gray-400">No applications yet.</li>}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl bg-white ring-1 ring-gray-200/70">
        <div className="border-b border-gray-100 px-5 py-3.5"><h3 className="text-sm font-bold">Most read articles</h3></div>
        <ul className="divide-y divide-gray-50">
          {topPosts.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <Link href={`/admin/posts/${p.id}`} className="truncate text-sm font-semibold hover:text-gold-deep">{p.title}</Link>
              <span className="flex shrink-0 items-center gap-1 text-xs text-gray-500"><Eye className="h-3.5 w-3.5" /> {p.views}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
