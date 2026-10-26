import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const u = new URL(req.url);
  const level = u.searchParams.get('level');
  const jobId = u.searchParams.get('jobId');
  const where: any = {};
  if (level && ['info', 'warn', 'error'].includes(level)) where.level = level;
  if (jobId) where.jobId = jobId;
  const items = await prisma.autoLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 }).catch(() => []);
  return ok({ items });
}

export async function DELETE() {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  await prisma.autoLog.deleteMany({}).catch(() => null);
  return ok();
}
