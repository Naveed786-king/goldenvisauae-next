import { prisma } from '@/lib/db';
import { ok, fail, rateLimit, clientIp, isEmail } from '@/lib/api';
import { hashPassword, startSession } from '@/lib/auth';
import { notifyAdmin, rowsTable } from '@/lib/mail';

export async function POST(req: Request) {
  if (!rateLimit('register:' + clientIp(req), 5, 10 * 60_000)) return fail('Too many attempts. Please try later.', 429);
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim().slice(0, 120);
  const email = String(b.email || '').toLowerCase().trim().slice(0, 200);
  const password = String(b.password || '');
  if (password.length > 200) return fail('Password is too long');
  if (!name) return fail('Please enter your name');
  if (!isEmail(email)) return fail('Please enter a valid email');
  if (password.length < 8) return fail('Password must be at least 8 characters');
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return fail('An account with this email already exists. Please log in.');
  const user = await prisma.user.create({
    data: { name, email, phone: b.phone ? String(b.phone).slice(0, 40) : null, nationality: b.nationality ? String(b.nationality).slice(0, 80) : null, passwordHash: await hashPassword(password), role: 'CUSTOMER' },
  });
  await startSession(user);
  notifyAdmin(`New client account: ${name}`, rowsTable([['Name', name], ['Email', email], ['Phone', user.phone]]), email, 'accounts');
  return ok({ ok: true, redirect: '/account' });
}
