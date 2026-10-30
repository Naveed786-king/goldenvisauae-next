import { prisma } from '@/lib/db';
import { ok, fail, rateLimit } from '@/lib/api';
import { getSession, checkPassword, hashPassword, startSession } from '@/lib/auth';

export async function PUT(req: Request) {
  const s = await getSession();
  if (!s) return fail('Unauthorized', 401);
  if (!rateLimit('pw-change:' + s.sub, 8, 15 * 60_000)) return fail('Too many attempts. Please wait a few minutes.', 429);
  const { current, password } = await req.json().catch(() => ({}));
  if (String(password || '').length > 200) return fail('Password is too long');
  if (!password || String(password).length < 8) return fail('New password must be at least 8 characters');
  const user = await prisma.user.findUnique({ where: { id: s.sub } });
  if (!user || !(await checkPassword(String(current || ''), user.passwordHash))) return fail('Current password is incorrect');
  const updated = await prisma.user.update({ where: { id: s.sub }, data: { passwordHash: await hashPassword(String(password)) } });
  // every other login with the old password ends; this device stays signed in
  await startSession(updated);
  return ok();
}
