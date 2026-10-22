import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  const { token, password } = await req.json().catch(() => ({}));
  if (!token || !password || String(password).length < 8) return fail('Password must be at least 8 characters');
  const user = await prisma.user.findFirst({ where: { resetToken: String(token), resetExpires: { gt: new Date() } } });
  if (!user) return fail('This reset link is invalid or has expired');
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(String(password)), resetToken: null, resetExpires: null } });
  return ok();
}
