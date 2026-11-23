import { ok, fail } from '@/lib/api';
import { requireAdmin, requireStaff } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Data for the Online payments page (totals and all payments) and the WhatsApp / email logs. */
export async function GET(req: Request) {
  if (!(await requireStaff())) return fail('Unauthorized', 401);
  const u = new URL(req.url);
  const what = u.searchParams.get('what');
  if (what === 'payments') {
    const rows = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 500, include: { application: { select: { id: true, refNo: true, fullName: true, token: true } } } });
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const paid = rows.filter((p) => p.status === 'paid');
    const sum = (l: typeof rows) => Math.round(l.reduce((s, p) => s + p.amount, 0) * 100) / 100;
    return ok({
      kpi: {
        month: sum(paid.filter((p) => (p.paidAt || p.createdAt) >= monthStart)),
        total: sum(paid),
        waiting: sum(rows.filter((p) => p.status !== 'paid')),
        open: rows.filter((p) => p.status !== 'paid').length,
      },
      rows: rows.map((p) => ({ id: p.id, at: (p.paidAt || p.createdAt).toISOString(), client: p.application?.fullName || '', ref: p.application?.refNo || '', appId: p.application?.id || '', label: p.label, amount: p.amount, status: p.status === 'paid' ? 'paid' : p.providerId ? 'checkout' : 'due', method: p.method || '', txn: p.txn || '', receiptNo: p.receiptNo || '', receipt: p.status === 'paid' && p.application?.token ? `/api/portal/${p.application.token}/receipt/${p.id}` : '' })),
    });
  }
  if (what === 'log') {
    const channel = u.searchParams.get('channel') === 'email' ? 'email' : 'whatsapp';
    const rows = await prisma.notifyLog.findMany({ where: { channel }, orderBy: { createdAt: 'desc' }, take: 150 });
    const ids = [...new Set(rows.map((r) => r.applicationId).filter(Boolean))] as string[];
    const apps = ids.length ? await prisma.application.findMany({ where: { id: { in: ids } }, select: { id: true, refNo: true } }) : [];
    const ref = new Map(apps.map((a) => [a.id, a.refNo]));
    return ok({ rows: rows.map((r) => ({ id: r.id, at: r.createdAt.toISOString(), to: r.to, event: r.event, direction: r.direction, ok: r.ok, error: r.error || '', text: (r.text || '').slice(0, 300), appId: r.applicationId || '', ref: (r.applicationId && ref.get(r.applicationId)) || '' })) });
  }
  return fail('Unknown request', 400);
}

/** Clears the WhatsApp or email log (Admin > WhatsApp / Emails & PDFs). */
export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const channel = new URL(req.url).searchParams.get('channel') === 'email' ? 'email' : 'whatsapp';
  await prisma.notifyLog.deleteMany({ where: { channel } });
  return ok({});
}
