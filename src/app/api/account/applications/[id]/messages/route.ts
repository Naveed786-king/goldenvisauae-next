import { prisma } from '@/lib/db';
import { ok, fail, rateLimit } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { notifyAdmin, escapeHtml } from '@/lib/mail';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) return fail('Unauthorized', 401);
  if (!rateLimit('msg:' + s.sub, 20, 60_000)) return fail('Slow down a little', 429);
  const app = await prisma.application.findFirst({ where: { id, userId: s.sub } });
  if (!app) return fail('Not found', 404);
  const { body } = await req.json().catch(() => ({}));
  const text = String(body || '').trim().slice(0, 4000);
  if (!text) return fail('Message is empty');
  const msg = await prisma.message.create({ data: { applicationId: id, senderId: s.sub, body: text, fromAdmin: false } });
  await prisma.application.update({ where: { id }, data: { seen: false } });
  notifyAdmin(`New message on ${app.refNo} from ${s.name}`, `<p><b>${escapeHtml(s.name)}</b> wrote:</p><blockquote>${escapeHtml(text)}</blockquote>`, undefined, 'messages');
  return ok({ message: msg });
}
