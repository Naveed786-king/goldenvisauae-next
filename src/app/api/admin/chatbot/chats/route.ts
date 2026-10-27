import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { dayKey } from '@/lib/autopublisher/pure';

export const dynamic = 'force-dynamic';

/** ?id=… (one chat) or a list: ?range=today|week|all&status=handed|open&q=… */
export async function GET(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const u = new URL(req.url);
  const id = u.searchParams.get('id');
  if (id) {
    const c = await prisma.chatSession.findUnique({ where: { id } });
    if (!c) return fail('Not found', 404);
    return ok({ chat: { ...c, messages: JSON.parse(c.messages || '[]') } });
  }
  const range = u.searchParams.get('range') || 'today';
  const status = u.searchParams.get('status') || '';
  const q = (u.searchParams.get('q') || '').trim();
  const where: any = {};
  const startToday = new Date(`${dayKey()}T00:00:00+04:00`);
  if (range === 'today') where.createdAt = { gte: startToday };
  if (range === 'week') where.createdAt = { gte: new Date(startToday.getTime() - 6 * 86_400_000) };
  if (status === 'handed' || status === 'open') where.status = status;
  if (q) where.OR = [{ messages: { contains: q } }, { name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }, { summary: { contains: q } }];
  const items = await prisma.chatSession.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 200, select: { id: true, locale: true, page: true, status: true, handover: true, handedAt: true, name: true, phone: true, email: true, summary: true, count: true, leadId: true, createdAt: true, updatedAt: true } });
  return ok({ items });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return fail('Missing id');
  // deleteMany: an already deleted chat is fine; a real database error still reports a failure
  const r = await prisma.chatSession.deleteMany({ where: { id } });
  return ok({ deleted: r.count });
}
