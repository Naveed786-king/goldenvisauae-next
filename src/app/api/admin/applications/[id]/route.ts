import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { requireStaff } from '@/lib/auth';
import { APPLICATION_STATUSES } from '@/lib/defaults';
import { sendMail, escapeHtml } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  const { id } = await params;
  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, nationality: true, createdAt: true } },
      documents: { orderBy: { createdAt: 'desc' } },
      messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { name: true } } } },
    },
  });
  if (!app) return fail('Not found', 404);
  if (!app.seen) await prisma.application.update({ where: { id }, data: { seen: true } });
  await prisma.message.updateMany({ where: { applicationId: id, fromAdmin: false, read: false }, data: { read: true } });
  return ok({ application: app });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff();
  if (!s) return fail('Unauthorized', 401);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const before = await prisma.application.findUnique({ where: { id } });
  if (!before) return fail('Not found', 404);
  const data: any = {};
  if (b.status) {
    const st = APPLICATION_STATUSES.find((x) => x.value === b.status);
    if (!st) return fail('Invalid status');
    data.status = st.value;
    data.progress = b.progress !== undefined && b.progress !== null && b.progress !== '' ? Number(b.progress) : st.progress;
  } else if (b.progress !== undefined) data.progress = Number(b.progress) || 0;
  if (b.adminNote !== undefined) data.adminNote = String(b.adminNote || '') || null;
  if (b.service) data.service = String(b.service);
  const app = await prisma.application.update({ where: { id }, data });

  if (data.status && data.status !== before.status) {
    const st = APPLICATION_STATUSES.find((x) => x.value === data.status)!;
    await prisma.message.create({ data: { applicationId: id, senderId: s.sub, fromAdmin: true, body: `🔔 Status updated to “${st.label}”.${data.adminNote ? '\n' + data.adminNote : ''}` } });
    if (app.email && b.notify !== false) {
      const base = process.env.NEXT_PUBLIC_SITE_URL || '';
      sendMail({
        to: app.email,
        subject: `Update on your application ${app.refNo}: ${st.label}`,
        html: `<p>Dear ${escapeHtml(app.fullName)},</p><p>The status of your application <b>${app.refNo}</b> (${escapeHtml(app.service)}) is now: <b>${st.label}</b>.</p>${app.adminNote ? `<p>${escapeHtml(app.adminNote)}</p>` : ''}<p><a href="${base}/account/applications/${app.id}">View your application</a></p>`,
      });
    }
  }
  return ok({ application: app });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff();
  if (!s || s.role !== 'ADMIN') return fail('Admins only', 403);
  const { id } = await params;
  await prisma.application.delete({ where: { id } });
  return ok();
}
