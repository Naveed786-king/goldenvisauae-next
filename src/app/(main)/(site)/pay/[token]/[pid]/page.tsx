import { notFound } from 'next/navigation';
import { CreditCard, Landmark, ShieldCheck } from 'lucide-react';
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { byToken, charged, fileLink, money } from '@/lib/portal/files';
import { cardFee, payOnline } from '@/lib/portal/payments';
import SlipUpload from '@/components/portal/SlipUpload';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payment', robots: { index: false, follow: false } };

/** Payment page of one payment request: card (with the card fee shown first) and/or bank transfer */
export default async function PayPage({ params, searchParams }: { params: Promise<{ token: string; pid: string }>; searchParams: Promise<Record<string, string>> }) {
  const { token, pid } = await params;
  const sp = await searchParams;
  const a = await byToken(token);
  const p = a ? await prisma.payment.findFirst({ where: { id: pid, applicationId: a.id } }) : null;
  if (!a || !p) notFound();
  const cfg = await getSetting('payments');
  const online = payOnline(cfg);
  const back = await fileLink(a);
  const base = `/api/portal/${token}/pay/${p.id}`;
  const cur = cfg.currency || 'AED';
  return (
    <section className="theme-sand min-h-[70vh] pt-[7rem] pb-20">
      <div className="container-x max-w-2xl">
        <p className="eyebrow">Secure payment</p>
        <h1 className="h-display mt-3 text-4xl">{p.label}</h1>
        <p className="mt-2 text-ink/60">
          {a.fullName} · Reference {a.refNo}
        </p>
        <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-ink/5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold uppercase tracking-wider text-ink/50">Amount</span>
            <span className="font-display text-3xl font-bold text-ink">{money(p.amount, cur)}</span>
          </div>
          {p.status === 'paid' && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">This payment is already paid. Receipt {p.receiptNo}. Thank you!</p>}
          {sp.error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">The payment page could not be opened. Please try again, or pay by bank transfer below.{sp.why && <span className="mt-1 block text-xs font-normal text-red-600">Card provider said: {String(sp.why).slice(0, 160)}</span>}</p>}
          {cfg.payText && p.status !== 'paid' && <p className="mt-4 whitespace-pre-line text-sm text-ink/70">{cfg.payText}</p>}
        </div>

        {p.status !== 'paid' && online && (
          <div className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-ink/5">
            <h2 className="flex items-center gap-2 font-bold text-ink"><CreditCard className="h-5 w-5 text-gold-deep" /> Pay by card</h2>
            {cfg.feeOn ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(['local', 'intl'] as const).map((k) => {
                  const fee = cardFee(cfg, p.amount, k);
                  return (
                    <a key={k} href={`${base}?card=${k}`} className="rounded-2xl border border-ink/10 p-4 transition hover:border-gold hover:shadow-md">
                      <p className="font-bold text-ink">{k === 'local' ? 'UAE bank card' : 'International card'}</p>
                      <p className="mt-1 text-xs text-ink/55">Card fee {money(fee, cur)}</p>
                      <p className="mt-2 font-display text-xl font-bold text-ink">{money(charged({ amount: p.amount, fee }), cur)}</p>
                    </a>
                  );
                })}
              </div>
            ) : (
              <a href={base} className="btn btn-gold mt-4 w-full justify-center">Pay {money(p.amount, cur)} now</a>
            )}
            <p className="mt-4 flex items-center gap-2 text-xs text-ink/50"><ShieldCheck className="h-4 w-4" /> You pay on the secure page of our payment provider. We never see your card details.</p>
          </div>
        )}

        {p.status !== 'paid' && !online && p.link && (
          <a href={p.link} className="btn btn-gold mt-6 w-full justify-center" rel="noopener noreferrer">Open the payment link</a>
        )}

        {p.status !== 'paid' && cfg.bankOn && (
          <div id="bank" className="mt-6 rounded-3xl bg-white p-6 ring-1 ring-ink/5">
            <h2 className="flex items-center gap-2 font-bold text-ink"><Landmark className="h-5 w-5 text-gold-deep" /> Pay by bank transfer</h2>
            <dl className="mt-4 divide-y divide-ink/5 text-sm">
              {[
                ['Bank', cfg.bankName],
                ['Account name', cfg.bankHolder],
                ['IBAN', cfg.bankIban],
                ['Account no.', cfg.bankAccount],
                ['SWIFT', cfg.bankSwift],
                ['Amount', money(p.amount, cur)],
                ['Reference', a.refNo],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-ink/50">{k}</dt>
                    <dd className="select-all text-right font-semibold text-ink">{v}</dd>
                  </div>
                ))}
            </dl>
            {cfg.bankNote && <p className="mt-3 whitespace-pre-line text-xs text-ink/60">{cfg.bankNote}</p>}
            <SlipUpload token={token} pid={p.id} sent={!!p.slipPath} />
          </div>
        )}

        <a href={back} className="mt-8 inline-block text-sm font-bold text-ink/60 hover:text-gold-deep">← Back to my application</a>
      </div>
    </section>
  );
}
