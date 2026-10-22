import { prisma } from '@/lib/db';
import { ok, fail, rateLimit, clientIp, isEmail } from '@/lib/api';
import { hashPassword, startSession } from '@/lib/auth';

// First-run setup: creates the first admin account. Only works while NO admin exists.
export async function POST(req: Request) {
  if (!rateLimit('setup:' + clientIp(req), 5, 10 * 60_000)) return fail('Too many attempts. Please wait.', 429);
  const { name, email, password } = await req.json().catch(() => ({}));
  const mail = String(email || '').toLowerCase().trim();
  if (!isEmail(mail)) return fail('Please enter a valid email address');
  if (String(password || '').length < 8) return fail('Password must be at least 8 characters');
  const user = await prisma.$transaction(async (tx) => {
    if ((await tx.user.count({ where: { role: 'ADMIN' } })) > 0) return null;
    const passwordHash = await hashPassword(String(password));
    return tx.user.upsert({
      where: { email: mail },
      update: { role: 'ADMIN', active: true, passwordHash },
      create: { name: String(name || 'Administrator').slice(0, 80), email: mail, role: 'ADMIN', passwordHash },
    });
  });
  if (!user) return fail('An admin account already exists. Please sign in.', 403);
  await startSession(user);
  return ok({ ok: true, redirect: '/admin' });
}
