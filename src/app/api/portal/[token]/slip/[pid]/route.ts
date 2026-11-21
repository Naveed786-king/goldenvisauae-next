import { prisma } from '@/lib/db';
import { ok, fail, rateLimit, clientIp } from '@/lib/api';
import { byToken, money } from '@/lib/portal/files';
import { savePrivateFile } from '@/lib/upload';
import { notifyTeam } from '@/lib/portal/notify';

export const dynamic = 'force-dynamic';

/** Bank transfer: the client uploads the transfer slip; the team checks it and marks the payment paid */
export async function POST(req: Request, { params }: { params: Promise<{ token: string; pid: string }> }) {
  if (!rateLimit('slip:' + clientIp(req), 10, 10 * 60_000)) return fail('Too many uploads. Please try again later.', 429);
  const { token, pid } = await params;
  const a = await byToken(token);
  const p = a ? await prisma.payment.findFirst({ where: { id: pid, applicationId: a.id } }) : null;
  if (!a || !p) return fail('Not found', 404);
  if (p.status === 'paid') return fail('This payment is already paid');
  const fd = await req.formData().catch(() => null);
  const file = fd?.get('file');
  if (!file || typeof file !== 'object' || !('arrayBuffer' in file) || !(file as File).size) return fail('Please choose the transfer slip (PDF or photo)');
  try {
    const saved = await savePrivateFile(file as File, a.id);
    await prisma.document.create({ data: { applicationId: a.id, name: `Bank transfer slip - ${p.label} - ${(file as File).name}`.slice(0, 200), path: saved.path, mime: saved.mime, size: saved.size, uploadedBy: 'customer' } });
    await prisma.payment.update({ where: { id: p.id }, data: { slipPath: saved.path, method: 'Bank transfer (to be checked)' } });
    await prisma.message.create({ data: { applicationId: a.id, fromAdmin: false, body: `🏦 I uploaded the bank transfer slip for "${p.label}" (${money(p.amount)}).` } });
    await prisma.application.update({ where: { id: a.id }, data: { seen: false } });
    void notifyTeam('teamSlip', { name: a.fullName, ref: a.refNo, item: p.label, amount: money(p.amount) }, a.id);
    return ok({ ok: true });
  } catch (e) {
    return fail((e as Error).message || 'Upload failed');
  }
}
