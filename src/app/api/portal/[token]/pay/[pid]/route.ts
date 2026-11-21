import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { byToken, fileLink, siteUrl } from '@/lib/portal/files';
import { cardFee, orderPayment, payOnline, startCheckout, type CardKind } from '@/lib/portal/payments';
import { rateLimit, clientIp } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * "Pay now": opens the card payment page of the active provider (or the manual payment link).
 * pid "order" = pay the whole open amount of the quotation ("Pay & confirm").
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string; pid: string }> }) {
  const { token, pid: raw } = await params;
  const a = await byToken(token);
  if (!a) return new NextResponse('Not found', { status: 404 });
  const file = await fileLink(a);
  if (!rateLimit('pay:' + clientIp(req), 20, 10 * 60_000)) return NextResponse.redirect(`${file}?payerror=1`, 303);
  const cfg = await getSetting('payments');
  let pid = raw;
  if (raw === 'order') {
    if (!cfg.payOnQuote) return NextResponse.redirect(file, 303);
    const id = await orderPayment(a);
    if (!id) return NextResponse.redirect(file, 303);
    pid = id;
  }
  let p = await prisma.payment.findFirst({ where: { id: pid, applicationId: a.id } });
  if (!p) return NextResponse.redirect(file, 303);
  const page = `${siteUrl()}/pay/${token}/${p.id}`;
  if (p.status === 'paid') return NextResponse.redirect(`${page}/return?ok=1`, 303);
  if (!payOnline(cfg)) {
    // no online provider: the team's own payment link, or the page with the bank details
    if (p.link && /^https:\/\//.test(p.link)) return NextResponse.redirect(p.link, 303);
    return NextResponse.redirect(page, 303);
  }
  // card fee: the client first picks a UAE or an international card on our page
  const card = req.nextUrl.searchParams.get('card');
  if (cfg.feeOn) {
    if (card !== 'local' && card !== 'intl') return NextResponse.redirect(page, 303);
    p = await prisma.payment.update({ where: { id: p.id }, data: { fee: cardFee(cfg, p.amount, card as CardKind), card } });
  } else if (p.fee) p = await prisma.payment.update({ where: { id: p.id }, data: { fee: 0, card: null } });
  try {
    const r = await startCheckout(a, p, `${page}/return?x=1`, `${file}?cancelled=1`);
    if (!r.url) throw new Error('No payment page returned');
    await prisma.payment.update({ where: { id: p.id }, data: { provider: r.provider, providerId: r.providerId, providerRef: r.providerRef, startedAt: new Date(), tries: { increment: 1 } } });
    return NextResponse.redirect(r.url, 303);
  } catch (e) {
    console.error('[pay] checkout not started:', (e as Error).message);
    return NextResponse.redirect(`${page}?error=1`, 303);
  }
}
