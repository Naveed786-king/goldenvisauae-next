import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { getSession, startSession } from '@/lib/auth';

export async function PUT(req: Request) {
  const s = await getSession();
  if (!s) return fail('Unauthorized', 401);
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim();
  if (!name) return fail('Name is required');
  const user = await prisma.user.update({
    where: { id: s.sub },
    data: { name, phone: b.phone ? String(b.phone) : null, nationality: b.nationality ? String(b.nationality) : null },
  });
  await startSession(user);
  return ok();
}
