import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { currentStageId, decisionOf, metaOf, quoteOf, quoteTotal, stepsFor } from '@/lib/portal/files';
import { formatDate } from '@/lib/utils';
import { DeleteFileButton } from '@/components/admin/DeleteFileButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Applications' };

const DECISIONS = [
  ['awaiting', 'Awaiting'],
  ['approved', 'Approved'],
  ['rejected', 'Not approved'],
  ['on_hold', 'On hold'],
  ['withdrawn', 'Withdrawn'],
] as const;
const ARCHIVED = new Set(['completed', 'rejected', 'cancelled', 'withdrawn', 'archived']);
const fmt = (n: number) => `AED ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Client files, start to finish (the Abu Dhabi Golden Visa admin list): step and progress, payment, messages. */
export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const tab = sp.tab === 'archived' ? 'archived' : 'active';
  const dec = sp.decision || '';
  const q = (sp.q || '').trim().toLowerCase();
  const isAdmin = (await getSession())?.role === 'ADMIN';

  const rows = await prisma.application.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { payments: { select: { amount: true, status: true } }, _count: { select: { messages: true } } },
    take: 1000,
  });
  const files = await Promise.all(
    rows.map(async (a) => {
      const steps = await stepsFor(a.service);
      const curId = currentStageId(a, steps);
      const idx = Math.max(0, steps.findIndex((s) => s.id === curId));
      const d = decisionOf(a);
      const qt = quoteOf(a);
      const paid = a.payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
      const due = a.payments.filter((p) => p.status !== 'paid').reduce((s, p) => s + p.amount, 0);
      const total = qt.sentAt ? quoteTotal(qt) : 0;
      const pay = due > 0 ? { cls: 'bg-red-50 text-red-700', text: `Due · ${fmt(due)}` } : paid > 0 && paid >= total ? { cls: 'bg-emerald-50 text-emerald-700', text: `Paid in full · ${fmt(paid)}` } : paid > 0 ? { cls: 'bg-amber-50 text-amber-700', text: `Part paid · ${fmt(paid)}` } : qt.sentAt ? { cls: 'bg-amber-50 text-amber-800', text: `Quote sent · ${fmt(total)}` } : { cls: 'bg-gray-100 text-gray-500', text: 'No quote yet' };
      return {
        a,
        step: steps[idx]?.name || 'Application received',
        pct: steps.length ? Math.round(((idx + 1) / steps.length) * 100) : 10,
        decision: d.result || 'awaiting',
        archived: ARCHIVED.has(a.status) || d.result === 'withdrawn' || metaOf(a).archived,
        pay,
      };
    }),
  );
  const inTab = files.filter((f) => (tab === 'archived' ? f.archived : !f.archived));
  const counts = Object.fromEntries(DECISIONS.map(([k]) => [k, inTab.filter((f) => f.decision === k).length]));
  const shown = inTab.filter(
    (f) => (!dec || f.decision === dec) && (!q || `${f.a.refNo} ${f.a.fullName} ${f.a.phone || ''} ${f.a.email || ''} ${f.a.service}`.toLowerCase().includes(q)),
  );
  const link = (p: Record<string, string>) => {
    const u = new URLSearchParams({ ...(tab === 'archived' ? { tab } : {}), ...(dec ? { decision: dec } : {}), ...(q ? { q } : {}), ...p });
    for (const [k, v] of [...u.entries()]) if (!v) u.delete(k);
    const s = u.toString();
    return `/admin/applications${s ? `?${s}` : ''}`;
  };
  const chip = (on: boolean) => `rounded-xl px-3 py-1.5 text-xs font-bold ring-1 transition ${on ? 'bg-gradient-to-b from-[#e8c766] to-[#c9a032] text-[#1a1406] ring-transparent' : 'bg-white text-gray-700 ring-gray-200 hover:ring-[#c9a032]'}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-gray-400">Applications</p>
          <h1 className="font-display text-3xl font-semibold text-gray-900">Client files, start to finish.</h1>
        </div>
        <form className="flex flex-wrap gap-2" action="/admin/applications">
          {tab === 'archived' && <input type="hidden" name="tab" value="archived" />}
          {dec && <input type="hidden" name="decision" value={dec} />}
          <input name="q" defaultValue={sp.q || ''} placeholder="Search ref, name, phone" className="admin-input w-56" />
          <button className="rounded-xl bg-white px-4 py-2 text-sm font-bold ring-1 ring-gray-200">Search</button>
          <a href="/api/admin/export?type=applications" className="rounded-xl bg-white px-4 py-2 text-sm font-bold ring-1 ring-gray-200">Export CSV</a>
          <a href="/portal/apply" target="_blank" className="rounded-xl bg-gradient-to-b from-[#e8c766] to-[#c9a032] px-4 py-2 text-sm font-bold text-[#1a1406]">New application</a>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={link({ tab: '' })} className={chip(tab === 'active')}>Active</Link>
        <Link href={link({ tab: 'archived' })} className={chip(tab === 'archived')}>Archived</Link>
        <span className="mx-1 text-xs text-gray-400">Decision</span>
        {DECISIONS.map(([k, label]) => (
          <Link key={k} href={link({ decision: dec === k ? '' : k })} className={chip(dec === k)}>
            {label} ({counts[k]})
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 text-sm text-gray-500">
          <span>{shown.length} files</span>
        </div>
        {shown.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-gray-500">No files here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[0.68rem] font-extrabold uppercase tracking-wider text-gray-400">
                  <th className="px-5 py-3">Ref</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="hidden px-3 py-3 md:table-cell">Route</th>
                  <th className="px-3 py-3">Progress</th>
                  <th className="hidden px-3 py-3 lg:table-cell">Payment</th>
                  <th className="hidden px-3 py-3 lg:table-cell">Messages</th>
                  <th className="hidden px-3 py-3 md:table-cell">Updated</th>
                  {isAdmin && <th className="px-3 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map(({ a, step, pct, pay }) => (
                  <tr key={a.id} className="align-top transition hover:bg-[#fbf7ea]">
                    <td className="px-5 py-4">
                      <Link href={`/admin/applications/${a.id}`} className="font-mono text-xs font-bold text-gray-900 hover:underline">{a.refNo}</Link>
                      {!a.seen && <span className="ml-1 rounded bg-red-500 px-1.5 py-0.5 text-[0.6rem] font-bold text-white">NEW</span>}
                    </td>
                    <td className="px-3 py-4">
                      <Link href={`/admin/applications/${a.id}`} className="font-semibold text-gray-900 hover:underline">{a.fullName}</Link>
                      <p className="text-xs text-gray-400">{a.phone}</p>
                    </td>
                    <td className="hidden px-3 py-4 text-gray-600 md:table-cell">
                      {a.service}
                      <p className="text-xs text-gray-400">{a.assignee || 'Not assigned'}{a.familyMembers ? ` · ${a.familyMembers + 1} people` : ''}</p>
                    </td>
                    <td className="w-48 px-3 py-4">
                      <p className="text-xs font-semibold text-gray-700">{step}</p>
                      <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <span className="block h-full rounded-full bg-gradient-to-r from-[#e8c766] to-[#b8862f]" style={{ width: `${pct}%` }} />
                      </span>
                    </td>
                    <td className="hidden px-3 py-4 lg:table-cell">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${pay.cls}`}>{pay.text}</span>
                    </td>
                    <td className="hidden px-3 py-4 text-gray-500 lg:table-cell">{a._count.messages}</td>
                    <td className="hidden px-3 py-4 text-xs text-gray-500 md:table-cell">{formatDate(a.updatedAt)}</td>
                    {isAdmin && (
                      <td className="px-3 py-4 text-right">
                        <DeleteFileButton id={a.id} refNo={a.refNo} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
