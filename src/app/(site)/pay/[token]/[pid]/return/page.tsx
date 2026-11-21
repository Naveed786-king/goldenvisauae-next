import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { byToken, charged, fileLink, money } from '@/lib/portal/files';
import PayConfirm from '@/components/portal/PayConfirm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Confirming your payment', robots: { index: false, follow: false } };

/** The provider sends the client back here: we ask the provider until the payment is confirmed */
export default async function PayReturn({ params, searchParams }: { params: Promise<{ token: string; pid: string }>; searchParams: Promise<Record<string, string>> }) {
  const { token, pid } = await params;
  const sp = await searchParams;
  const a = await byToken(token);
  const p = a ? await prisma.payment.findFirst({ where: { id: pid, applicationId: a.id } }) : null;
  if (!a || !p) notFound();
  return (
    <section className="theme-sand min-h-[70vh] pt-[7rem] pb-20">
      <div className="container-x max-w-xl">
        <PayConfirm
          token={token}
          pid={p.id}
          initial={p.status === 'paid' ? 'paid' : sp.failed ? 'failed' : 'pending'}
          amount={money(charged(p))}
          label={p.label}
          refNo={a.refNo}
          receiptNo={p.receiptNo || ''}
          back={await fileLink(a)}
        />
      </div>
    </section>
  );
}
