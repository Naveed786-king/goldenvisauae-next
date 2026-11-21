import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { clientView } from '@/lib/portal/view';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) return fail('Unauthorized', 401);
  const app = await prisma.application.findFirst({
    where: { id, userId: s.sub },
    include: {
      // documents the team keeps private are not shown to the client
      documents: { where: { shared: true }, orderBy: { createdAt: 'desc' } },
      messages: { orderBy: { createdAt: 'asc' } },
      payments: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!app) return fail('Not found', 404);
  // mark admin messages as read
  await prisma.message.updateMany({ where: { applicationId: id, fromAdmin: true, read: false }, data: { read: true } });
  const { token: _t, stageStatus: _s, stageDates: _d, quote: _q, decision: _dc, assignee: _as, payments: _p, ...rest } = app;
  return ok({ application: { ...rest, ...(await clientView(app)) } });
}
