import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { requireStaff } from '@/lib/auth';
import { notifyClient } from '@/lib/portal/notify';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  const { id } = await params;
  const { body, email } = await req.json().catch(() => ({}));
  const text = String(body || '').trim();
  if (!text) return fail('Message is empty');
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) return fail('Not found', 404);
  const msg = await prisma.message.create({ data: { applicationId: id, senderId: s.sub, body: text, fromAdmin: true } });
  await prisma.application.update({ where: { id }, data: { updatedAt: new Date() } });
  // "notify": the client gets the message by email and WhatsApp too
  if (email) void notifyClient(app, 'message', { text: text.slice(0, 1500) }, { force: true });
  return ok({ message: msg });
}
