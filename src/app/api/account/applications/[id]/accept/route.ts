import { prisma } from '@/lib/db';
import { ok, fail } from '@/lib/api';
import { getSession } from '@/lib/auth';
import { money, quoteOf, quoteTotal, setStage, stepsFor } from '@/lib/portal/files';
import { notifyClient, notifyTeam } from '@/lib/portal/notify';

export const dynamic = 'force-dynamic';

/** The client accepts the quotation in the dashboard */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession();
  if (!s) return fail('Unauthorized', 401);
  const app = await prisma.application.findFirst({ where: { id, userId: s.sub } });
  if (!app) return fail('Not found', 404);
  const q = quoteOf(app);
  if (!q.sentAt) return fail('There is no quotation to accept yet');
  if (q.acceptedAt) return ok({ ok: true });
  if (q.validUntil && new Date(q.validUntil).getTime() < Date.now() - 86_400_000) return fail('This quotation has expired. Please ask your advisor for an updated quote.');
  q.acceptedAt = new Date().toISOString();
  await prisma.application.update({ where: { id }, data: { quote: JSON.stringify(q), seen: false } });
  await prisma.message.create({ data: { applicationId: id, senderId: s.sub, fromAdmin: false, body: '✅ I accept the quotation.' } });
  const steps = await stepsFor(app.service);
  const cur = steps.findIndex((x) => x.id === app.stageId);
  const okIdx = steps.findIndex((x) => x.id === 'quote-ok');
  if (okIdx >= 0 && cur < okIdx) await setStage(id, 'quote-ok');
  void notifyClient(app, 'confirmed', { total: money(quoteTotal(q)) });
  void notifyTeam('teamMessage', { name: app.fullName, ref: app.refNo, text: `Accepted the quotation (${money(quoteTotal(q))}).` }, id);
  return ok({ ok: true });
}
