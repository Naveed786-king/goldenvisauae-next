import { prisma } from '@/lib/db';
import { ok, fail, rateLimit, clientIp } from '@/lib/api';
import { checkPassword, startSession, isStaff } from '@/lib/auth';

export async function POST(req: Request) {
  if (!rateLimit('login:' + clientIp(req), 10, 5 * 60_000)) return fail('Too many attempts. Please wait a few minutes.', 429);
  const { email, password, admin } = await req.json().catch(() => ({}));
  if (!email || !password) return fail('Email and password are required');
  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  if (!user || !(await checkPassword(String(password), user.passwordHash))) return fail('Invalid email or password', 401);
  if (!user.active) return fail('This account is disabled. Please contact support.', 403);
  if (admin && !isStaff(user.role)) return fail('This account does not have admin access', 403);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await startSession(user);
  return ok({ ok: true, role: user.role, redirect: isStaff(user.role) ? '/admin' : '/account' });
}
