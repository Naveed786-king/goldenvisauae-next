import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { requireStaff, checkPassword, hashPassword, startSession } from '@/lib/auth';

export async function PUT(req: Request) {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  const b = await req.json().catch(() => ({}));
  const user = await prisma.user.findUnique({ where: { id: s.sub } });
  if (!user) return fail('Not found', 404);
  const data: any = {};
  if (b.name) data.name = String(b.name);
  if (b.email) data.email = String(b.email).toLowerCase().trim();
  if (b.password) {
    if (!(await checkPassword(String(b.current || ''), user.passwordHash))) return fail('Current password is incorrect');
    if (String(b.password).length < 8) return fail('New password must be at least 8 characters');
    data.passwordHash = await hashPassword(String(b.password));
  }
  try {
    const u = await prisma.user.update({ where: { id: s.sub }, data });
    await startSession(u);
    return ok();
  } catch (e: any) {
    return fail(e.code === 'P2002' ? 'Email already in use' : e.message);
  }
}
