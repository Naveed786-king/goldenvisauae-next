import Link from 'next/link';
import { ArrowRight, FilePlus, MessageCircle, FileText, Clock } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import { StatusBadge, Progress } from '@/components/ui/Status';
import { formatDate } from '@/lib/utils';
import AutoRefresh from '@/components/portal/AutoRefresh';

export default async function AccountPage() {
  const s = await getSession();
  const site = await getSetting('site');
  const apps = await prisma.application.findMany({
    where: { userId: s!.sub },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { documents: true } }, messages: { where: { fromAdmin: true, read: false }, select: { id: true } } },
  });
  const unread = apps.reduce((n, a) => n + a.messages.length, 0);
  return (
    <div className="space-y-8">
      <AutoRefresh seconds={20} />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Applications', value: apps.length, icon: FileText },
          { label: 'In progress', value: apps.filter((a) => !['completed', 'rejected', 'cancelled'].includes(a.status)).length, icon: Clock },
          { label: 'Unread messages', value: unread, icon: MessageCircle },
        ].map((c) => (
          <div key={c.label} className="flex items-center gap-4 rounded-3xl bg-white p-6 ring-1 ring-ink/5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/15 text-gold-deep"><c.icon className="h-6 w-6" /></span>
            <div>
              <p className="font-display text-4xl font-bold text-ink">{c.value}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-ink/50">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[2rem] bg-white p-6 md:p-8 ring-1 ring-ink/5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-3xl font-semibold text-ink">My applications</h2>
          <Link href="/apply" className="btn btn-gold btn-sm"><FilePlus className="h-4 w-4" /> New</Link>
        </div>
        {apps.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-ink/60">You have not submitted any applications yet.</p>
            <Link href="/apply" className="btn btn-gold mt-6">Start your Golden Visa application <ArrowRight className="h-4 w-4" /></Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {apps.map((a) => (
              <Link key={a.id} href={`/account/applications/${a.id}`} className="group grid gap-4 rounded-2xl border border-ink/5 p-5 transition hover:border-gold/50 hover:shadow-lg md:grid-cols-[1fr_220px_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-ink/50">{a.refNo}</span>
                    <StatusBadge status={a.status} />
                    {a.messages.length > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[0.65rem] font-bold text-white">{a.messages.length} new message{a.messages.length > 1 ? 's' : ''}</span>}
                  </div>
                  <p className="mt-2 font-bold text-ink">{a.service}</p>
                  <p className="text-xs text-ink/50">Submitted {formatDate(a.createdAt)} · {a._count.documents} document(s)</p>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-ink/50 mb-1.5"><span>Progress</span><span>{a.progress}%</span></div>
                  <Progress value={a.progress} />
                </div>
                <ArrowRight className="hidden md:block h-5 w-5 text-ink/30 transition group-hover:translate-x-1 group-hover:text-gold-deep" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-[2rem] bg-ink p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h3 className="font-display text-2xl font-semibold !text-white">Need help with your application?</h3>
          <p className="text-sm text-white/60 mt-1">Call {site.phoneDisplay} or message us on WhatsApp — {site.hours}.</p>
        </div>
        <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn btn-gold">WhatsApp us</a>
      </div>
    </div>
  );
}
