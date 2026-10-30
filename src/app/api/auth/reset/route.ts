import { prisma } from '@/lib/db';
import crypto from 'crypto';
import { ok, fail, rateLimit, clientIp } from '@/lib/api';
import { hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  if (!rateLimit('reset:' + clientIp(req), 10, 10 * 60_000)) return fail('Too many attempts. Please wait a few minutes.', 429);
  const { token, password } = await req.json().catch(() => ({}));
  if (!token || !password || String(password).length < 8) return fail('Password must be at least 8 characters');
  if (String(password).length > 200) return fail('Password is too long');
  // only a hash of the link's token is stored, so a copy of the database cannot be used to reset passwords
  const hashed = crypto.createHash('sha256').update(String(token)).digest('hex');
  const user = await prisma.user.findFirst({ where: { resetToken: hashed, resetExpires: { gt: new Date() } } });
  if (!user) return fail('This reset link is invalid or has expired');
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(String(password)), resetToken: null, resetExpires: null } });
  return ok();
}
