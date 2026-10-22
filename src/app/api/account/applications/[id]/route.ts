import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) return fail('Unauthorized', 401);
  const app = await prisma.application.findFirst({
    where: { id, userId: s.sub },
    include: { documents: { orderBy: { createdAt: 'desc' } }, messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!app) return fail('Not found', 404);
  // mark admin messages as read
  await prisma.message.updateMany({ where: { applicationId: id, fromAdmin: true, read: false }, data: { read: true } });
  return ok({ application: app });
}
