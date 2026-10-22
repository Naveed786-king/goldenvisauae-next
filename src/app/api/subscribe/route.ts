import { prisma } from '@/lib/db';
import { ok, fail, isEmail, rateLimit, clientIp } from '@/lib/api';
import { notifyAdmin, rowsTable } from '@/lib/mail';

export async function POST(req: Request) {
  if (!rateLimit('sub:' + clientIp(req), 5)) return fail('Too many requests', 429);
  const { email } = await req.json().catch(() => ({}));
  if (!isEmail(email)) return fail('Please enter a valid email');
  const existing = await prisma.subscriber.findUnique({ where: { email: email.toLowerCase() } });
  await prisma.subscriber.upsert({ where: { email: email.toLowerCase() }, update: {}, create: { email: email.toLowerCase() } });
  if (!existing) notifyAdmin(`New newsletter subscriber: ${email.toLowerCase()}`, rowsTable([['Email', email.toLowerCase()]]), undefined, 'subscribers');
  return ok();
}
