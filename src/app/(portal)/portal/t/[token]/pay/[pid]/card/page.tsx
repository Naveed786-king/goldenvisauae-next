import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { byToken, charged, fileLink, money } from '@/lib/portal/files';
import { cardFee, payOnline } from '@/lib/portal/payments';
import { coinImg } from '@/adgv/components/BrandLogo';
import { BRAND_NAME } from '@/adgv/lib/brand';
import { waLink } from '@/adgv/lib/site';

export const metadata: Metadata = { title: 'Choose your card', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Before a card payment, on the client dashboard address: UAE or international card, with the fee and the total shown first. */
export default async function ChooseCard({ params, searchParams }: { params: Promise<{ token: string; pid: string }>; searchParams: Promise<Record<string, string>> }) {
  const { token, pid } = await params;
  const sp = await searchParams;
  const a = await byToken(token);
  const p = a ? await prisma.payment.findFirst({ where: { id: pid, applicationId: a.id } }) : null;
  if (!a || !p) notFound();
  const file = await fileLink(a);
  if (p.status === 'paid') redirect(`${file}/pay/${p.id}/return?ok=1`);
  const cfg = await getSetting('payments');
  const cur = cfg.currency || 'AED';
  const online = payOnline(cfg);
  const api = `/api/portal/${encodeURIComponent(token)}/pay/${encodeURIComponent(p.id)}`;
  const vat = Number(cfg.feeVatPct ?? 5);
  const opts = [
    { k: 'local', t: 'UAE bank card', s: `Card issued by a bank in the UAE · ${cfg.feeLocalPct}% + ${cur} ${cfg.feeFixed}${vat ? ` + ${vat}% VAT` : ''}` },
    { k: 'intl', t: 'International bank card', s: `Card issued outside the UAE · ${cfg.feeIntlPct}% + ${cur} ${cfg.feeFixed}${vat ? ` + ${vat}% VAT` : ''}` },
  ] as const;
  const bankMsg = `Hello, I would like to pay ${p.label} for my file ${a.refNo} (${money(p.amount, cur)}) by bank transfer. Please send me your bank details.`;
  return (
    <main className="paywrap">
      <div className="paycard">
        <div className="paytop">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coinImg()} alt="" width={44} height={44} />
          <span>{BRAND_NAME}</span>
        </div>
        <div className="paybody cardpay">
          <h1 style={{ textAlign: 'center' }}>{online ? 'Choose your card' : 'Payment'}</h1>
          <p className="muted" style={{ textAlign: 'center' }}>
            {p.label} · {a.refNo}
            <br />
            <b style={{ fontSize: 20, color: 'inherit' }}>{money(p.amount, cur)}</b>
          </p>
          {sp.error && (
            <div className="paytext" style={{ borderColor: '#f3c2c2', background: '#fff5f5', color: '#9b1c1c' }}>
              The card payment page could not be opened. Please try again{cfg.bankOn ? ', or pay by bank transfer' : ''}.
              {sp.why && <small style={{ display: 'block', marginTop: 4 }}>Card provider said: {String(sp.why).slice(0, 160)}</small>}
            </div>
          )}
          {cfg.payText && <div className="paytext" style={{ whiteSpace: 'pre-line', textAlign: 'left' }}>{cfg.payText}</div>}
          {online && (
            <div className="cardopts">
              {cfg.feeOn ? (
                opts.map((o) => {
                  const fee = cardFee(cfg, p.amount, o.k);
                  return (
                    <a key={o.k} className="cardopt" href={`${api}?card=${o.k}`}>
                      <span>
                        <b>{o.t}</b>
                        <small>{o.s}</small>
                      </span>
                      <span className="cardopt-amt">
                        <small>Fee {money(fee, cur)}</small>
                        <b>{money(charged({ amount: p.amount, fee }), cur)}</b>
                        <em>Pay now →</em>
                      </span>
                    </a>
                  );
                })
              ) : (
                <a className="cardopt" href={api}>
                  <span>
                    <b>Pay by card</b>
                    <small>Secure payment page of our payment provider</small>
                  </span>
                  <span className="cardopt-amt">
                    <b>{money(p.amount, cur)}</b>
                    <em>Pay now →</em>
                  </span>
                </a>
              )}
            </div>
          )}
          {!online && p.link && /^https:\/\//.test(p.link) && (
            <a className="btn btn-gold" href={p.link} rel="noopener noreferrer">
              Open the payment link
            </a>
          )}
          <div className="cardalt">
            {cfg.bankOn && (cfg.bankIban || cfg.bankAccount) && (
              <a className="btn" href={`${file}#bank`}>
                🏦 Pay by bank transfer{cfg.feeOn ? ' (no card fee)' : ''}
              </a>
            )}
            <a className="btn btn-wa" href={waLink(bankMsg)} target="_blank" rel="noopener">
              💬 Ask for bank transfer on WhatsApp
            </a>
            <a className="btn btn-ghost" href={`${file}#payments`}>
              ← Back to my file
            </a>
          </div>
          {online && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>🔒 You pay on the secure page of our payment provider. We never see your card details.</p>}
        </div>
      </div>
    </main>
  );
}
