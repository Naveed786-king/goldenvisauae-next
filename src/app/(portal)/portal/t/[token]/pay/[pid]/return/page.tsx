import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { byToken, charged, fileLink, money } from '@/lib/portal/files';
import { PayResult } from '@/adgv/components/dash/PayResult';
import { coinImg } from '@/adgv/components/BrandLogo';
import { BRAND_NAME } from '@/adgv/lib/brand';

export const metadata: Metadata = { title: 'Confirming your payment', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** The card provider sends the client back here (client dashboard address): we ask the provider until the payment is confirmed. */
export default async function PayReturn({ params, searchParams }: { params: Promise<{ token: string; pid: string }>; searchParams: Promise<Record<string, string>> }) {
  const { token, pid } = await params;
  const sp = await searchParams;
  const a = await byToken(token);
  const p = a ? await prisma.payment.findFirst({ where: { id: pid, applicationId: a.id } }) : null;
  if (!a || !p) notFound();
  const cur = (await getSetting('payments')).currency || 'AED';
  const file = await fileLink(a);
  return (
    <PayResult
      token={token}
      pid={p.id}
      initial={p.status === 'paid' ? 'paid' : sp.failed ? 'failed' : 'pending'}
      brand={BRAND_NAME}
      coin={coinImg()}
      customer={a.fullName}
      label={p.label}
      amount={money(charged(p), cur)}
      appRef={a.refNo}
      receiptNo={p.receiptNo || ''}
      paidAt={p.paidAt ? p.paidAt.toISOString() : ''}
      file={file}
    />
  );
}
