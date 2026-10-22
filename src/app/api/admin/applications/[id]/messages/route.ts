import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { requireStaff } from '@/lib/auth';
import { sendMail, escapeHtml } from '@/lib/mail';

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
  if (email && app.email) {
    const base = process.env.NEXT_PUBLIC_SITE_URL || '';
    sendMail({ to: app.email, subject: `New message about your application ${app.refNo}`, html: `<p>${escapeHtml(text).replace(/\n/g, '<br/>')}</p><p><a href="${base}/account/applications/${app.id}">Reply in your account</a></p>` });
  }
  return ok({ message: msg });
}
