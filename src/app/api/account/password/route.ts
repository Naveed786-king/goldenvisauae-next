import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { getSession, checkPassword, hashPassword } from '@/lib/auth';

export async function PUT(req: Request) {
  const s = await getSession();
  if (!s) return fail('Unauthorized', 401);
  const { current, password } = await req.json().catch(() => ({}));
  if (!password || String(password).length < 8) return fail('New password must be at least 8 characters');
  const user = await prisma.user.findUnique({ where: { id: s.sub } });
  if (!user || !(await checkPassword(String(current || ''), user.passwordHash))) return fail('Current password is incorrect');
  await prisma.user.update({ where: { id: s.sub }, data: { passwordHash: await hashPassword(String(password)) } });
  return ok();
}
