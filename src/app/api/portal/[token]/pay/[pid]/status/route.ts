import { prisma } from '@/lib/db';
import { byToken } from '@/lib/portal/files';
import { checkStatus, methodName, settle } from '@/lib/portal/payments';
import { rateLimit, clientIp } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** The "Confirming your payment" page asks here every few seconds: we ask the provider, never trust the address bar */
export async function GET(req: Request, { params }: { params: Promise<{ token: string; pid: string }> }) {
  if (!rateLimit('paystat:' + clientIp(req), 60, 60_000)) return Response.json({ state: 'pending' });
  const { token, pid } = await params;
  const a = await byToken(token);
  const p = a ? await prisma.payment.findFirst({ where: { id: pid, applicationId: a.id } }) : null;
  if (!a || !p) return Response.json({ state: 'unknown' }, { status: 404 });
  if (p.status === 'paid') return Response.json({ state: 'paid', receiptNo: p.receiptNo });
  if (!p.providerId) return Response.json({ state: 'pending' });
  const s = await checkStatus(p);
  if (s.state === 'paid') {
    await settle(p.id, methodName(p.provider || ''), s.txn || p.providerId);
    const fresh = await prisma.payment.findUnique({ where: { id: p.id } });
    return Response.json({ state: 'paid', receiptNo: fresh?.receiptNo });
  }
  return Response.json({ state: s.state });
}
