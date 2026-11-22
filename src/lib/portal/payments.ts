// Online card payments with automatic confirmation.
// Providers: Ziina, Stripe Checkout, TotalPay, Network International (N-Genius), Telr. Bank transfer: the client
// uploads the slip and the team marks it paid.
// Flow: Pay → provider page → back to "Confirming your payment" (we ask the provider) and/or the provider's
// webhook → the payment is marked paid exactly once (receipt number, step, WhatsApp with PDF, email, team alert).
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { Application, Payment } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import type { PayProvider, PaymentSettings } from './config';
import { charged, currentStageId, money, quoteOf, quoteTotal, setStage, stepsFor, tokenLinks } from './files';

export const PROVIDERS: { id: PayProvider; name: string; note: string }[] = [
  { id: 'none', name: 'Manual (payment links)', note: 'Paste a payment link on each payment request and press "Mark paid" yourself.' },
  { id: 'ziina', name: 'Ziina', note: 'API access token from Ziina Business (Settings → API).' },
  { id: 'stripe', name: 'Stripe', note: 'Secret key (sk_live_ / sk_test_) and the webhook signing secret (whsec_).' },
  { id: 'totalpay', name: 'TotalPay', note: 'Merchant key and password from your TotalPay dashboard.' },
  { id: 'ngenius', name: 'Network International (N-Genius)', note: 'Service-account API key and outlet reference.' },
  { id: 'telr', name: 'Telr', note: 'Store ID and authentication key (Hosted Payment Page).' },
];

export function payReady(c: PaymentSettings) {
  switch (c.provider) {
    case 'stripe':
      return !!c.stripeSecret;
    case 'ziina':
      return !!c.ziinaToken;
    case 'ngenius':
      return !!(c.ngeniusKey && c.ngeniusOutlet);
    case 'telr':
      return !!(c.telrStore && c.telrKey);
    case 'totalpay':
      return !!(c.totalpayKey && c.totalpayPass);
    default:
      return false;
  }
}
export const payOnline = (c: PaymentSettings) => c.provider !== 'none' && payReady(c);

export type CardKind = 'local' | 'intl';
export function cardFee(c: PaymentSettings, amount: number, card: CardKind) {
  if (!c.feeOn) return 0;
  const pct = card === 'intl' ? c.feeIntlPct : c.feeLocalPct;
  return Math.round(((amount * (Number(pct) || 0)) / 100 + (Number(c.feeFixed) || 0)) * 100) / 100;
}

const fils = (n: number) => Math.round(n * 100);
const amt2 = (n: number) => n.toFixed(2);
const tpHash = (s: string) => createHash('sha1').update(createHash('md5').update(s.toUpperCase()).digest('hex')).digest('hex');
const ngBase = (c: PaymentSettings) => (c.test ? 'https://api-gateway.sandbox.ngenius-payments.com' : 'https://api-gateway.ngenius-payments.com');
const ziinaAuth = (c: PaymentSettings) => `Bearer ${c.ziinaToken.trim().replace(/^Bearer\s+/i, '')}`;

async function jfetch(url: string, init: RequestInit) {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(25_000) });
  const text = await r.text();
  let j: any = {};
  try {
    j = JSON.parse(text);
  } catch {
    j = { raw: text.slice(0, 300) };
  }
  if (!r.ok) throw new Error(j?.error?.message || j?.message || (typeof j?.error === 'string' ? j.error : '') || `HTTP ${r.status}`);
  return j;
}
async function ngToken(c: PaymentSettings) {
  const r = await fetch(`${ngBase(c)}/identity/auth/access-token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${c.ngeniusKey}`, 'Content-Type': 'application/vnd.ni-identity.v1+json', Accept: 'application/vnd.ni-identity.v1+json' },
    signal: AbortSignal.timeout(20_000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`N-Genius sign-in failed (${r.status})`);
  return String(j.access_token);
}

type App = Pick<Application, 'id' | 'refNo' | 'fullName' | 'email' | 'token'>;

/** Creates the provider's checkout for one payment and returns the page to send the client to */
export async function startCheckout(a: App, p: Payment, returnUrl: string, cancelUrl: string): Promise<{ url: string; providerId: string; providerRef: string; provider: PayProvider }> {
  const c = await getSetting('payments');
  if (!payOnline(c)) throw new Error('Online payment is not set up.');
  const ref = `GVU-${a.refNo}-${p.id.slice(-6)}`.replace(/[^\w-]/g, '').slice(0, 40);
  const desc = `${p.label} (${a.refNo})${p.fee ? ` + card fee ${p.fee.toFixed(2)}` : ''}`.slice(0, 120);
  const total = charged(p);
  const cur = c.currency || 'AED';
  const first = a.fullName.split(' ')[0];
  const last = a.fullName.split(' ').slice(1).join(' ') || '-';
  switch (c.provider) {
    case 'stripe': {
      const body = new URLSearchParams({
        mode: 'payment',
        client_reference_id: ref,
        success_url: `${returnUrl}&sid={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        'line_items[0][quantity]': '1',
        'line_items[0][price_data][currency]': cur.toLowerCase(),
        'line_items[0][price_data][unit_amount]': String(fils(total)),
        'line_items[0][price_data][product_data][name]': desc,
        'metadata[app]': a.id,
        'metadata[pid]': p.id,
        ...(a.email ? { customer_email: a.email } : {}),
      });
      const j = await jfetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${c.stripeSecret}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      return { url: j.url, providerId: j.id, providerRef: ref, provider: 'stripe' };
    }
    case 'ziina': {
      const j = await jfetch('https://api-v2.ziina.com/api/payment_intent', {
        method: 'POST',
        headers: { Authorization: ziinaAuth(c), 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: fils(total), currency_code: cur, message: desc, success_url: returnUrl, cancel_url: cancelUrl, failure_url: `${returnUrl}&failed=1`, test: c.test }),
      });
      return { url: j.redirect_url, providerId: j.id, providerRef: ref, provider: 'ziina' };
    }
    case 'ngenius': {
      const tok = await ngToken(c);
      const j = await jfetch(`${ngBase(c)}/transactions/outlets/${encodeURIComponent(c.ngeniusOutlet)}/orders`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/vnd.ni-payment.v2+json', Accept: 'application/vnd.ni-payment.v2+json' },
        body: JSON.stringify({ action: 'SALE', amount: { currencyCode: cur, value: fils(total) }, merchantOrderReference: ref, emailAddress: a.email || undefined, merchantAttributes: { redirectUrl: returnUrl, cancelUrl, skipConfirmationPage: true } }),
      });
      return { url: j?._links?.payment?.href, providerId: j.reference, providerRef: ref, provider: 'ngenius' };
    }
    case 'telr': {
      const cart = `${ref}-${randomBytes(2).toString('hex')}`;
      const j = await jfetch('https://secure.telr.com/gateway/order.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          method: 'create',
          store: Number(c.telrStore) || c.telrStore,
          authkey: c.telrKey,
          framed: 0,
          order: { cartid: cart, test: c.test ? '1' : '0', amount: amt2(total), currency: cur, description: desc },
          return: { authorised: returnUrl, declined: `${returnUrl}&failed=1`, cancelled: cancelUrl },
          customer: { email: a.email || undefined, name: { forenames: first, surname: last } },
        }),
      });
      if (!j?.order?.url) throw new Error(j?.error?.message || 'Telr did not return a payment page.');
      return { url: j.order.url, providerId: j.order.ref, providerRef: cart, provider: 'telr' };
    }
    case 'totalpay': {
      const number = `${ref}-${randomBytes(2).toString('hex')}`.slice(0, 50);
      const order = { number, amount: amt2(total), currency: cur, description: desc };
      const hash = tpHash(order.number + order.amount + order.currency + order.description + c.totalpayPass);
      const j = await jfetch(`${c.totalpayHost.replace(/\/$/, '')}/api/v1/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_key: c.totalpayKey, operation: 'purchase', methods: ['card'], order, success_url: returnUrl, cancel_url: cancelUrl, error_url: `${returnUrl}&failed=1`, customer: { name: a.fullName, email: a.email || undefined }, hash }),
      });
      if (!j.redirect_url) throw new Error('TotalPay did not return a payment page.');
      return { url: j.redirect_url, providerId: number, providerRef: number, provider: 'totalpay' };
    }
    default:
      throw new Error('Choose a payment provider.');
  }
}

/** Asks the provider whether the checkout was paid */
export async function checkStatus(p: Pick<Payment, 'provider' | 'providerId' | 'providerRef'>): Promise<{ state: 'paid' | 'pending' | 'failed'; txn?: string }> {
  const c = await getSetting('payments');
  const id = p.providerId || '';
  try {
    switch (p.provider) {
      case 'stripe': {
        // always the session saved for this payment (never an id from the address bar)
        const j = await jfetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${c.stripeSecret}` } });
        return j.payment_status === 'paid' ? { state: 'paid', txn: j.payment_intent || j.id } : j.status === 'expired' ? { state: 'failed' } : { state: 'pending' };
      }
      case 'ziina': {
        const j = await jfetch(`https://api-v2.ziina.com/api/payment_intent/${encodeURIComponent(id)}`, { headers: { Authorization: ziinaAuth(c) } });
        return j.status === 'completed' ? { state: 'paid', txn: j.id } : ['failed', 'canceled'].includes(j.status) ? { state: 'failed' } : { state: 'pending' };
      }
      case 'ngenius': {
        const tok = await ngToken(c);
        const j = await jfetch(`${ngBase(c)}/transactions/outlets/${encodeURIComponent(c.ngeniusOutlet)}/orders/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${tok}`, Accept: 'application/vnd.ni-payment.v2+json' } });
        const st = j?._embedded?.payment?.[0]?.state as string | undefined;
        if (st && ['CAPTURED', 'PURCHASED'].includes(st)) return { state: 'paid', txn: j?._embedded?.payment?.[0]?._id?.split(':').pop() || id };
        return st && ['FAILED', 'REVERSED', 'CANCELLED'].includes(st) ? { state: 'failed' } : { state: 'pending' };
      }
      case 'telr': {
        const j = await jfetch('https://secure.telr.com/gateway/order.json', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ method: 'check', store: Number(c.telrStore) || c.telrStore, authkey: c.telrKey, order: { ref: id } }) });
        const code = Number(j?.order?.status?.code);
        return code === 3 || code === 2 ? { state: 'paid', txn: j?.order?.transaction?.ref || id } : code < 0 ? { state: 'failed' } : { state: 'pending' };
      }
      case 'totalpay': {
        const j = await jfetch(`${c.totalpayHost.replace(/\/$/, '')}/api/v1/payment/status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ merchant_key: c.totalpayKey, order_id: id, hash: tpHash(id + c.totalpayPass) }) });
        const st = String(j.status || '').toLowerCase();
        return st === 'settled' ? { state: 'paid', txn: j.payment_id || id } : ['decline', 'void', 'refund', 'reversal', 'chargeback'].includes(st) ? { state: 'failed' } : { state: 'pending' };
      }
      default:
        return { state: 'pending' };
    }
  } catch (e) {
    console.error('[pay] status check failed:', (e as Error).message);
    return { state: 'pending' };
  }
}

export const methodName = (provider: string) => `Card (${PROVIDERS.find((x) => x.id === provider)?.name ?? provider})`;

/** Next receipt number of a file: REF-R1, REF-R2… */
async function nextReceipt(appId: string, refNo: string) {
  const n = await prisma.payment.count({ where: { applicationId: appId, receiptNo: { not: null } } });
  return `${refNo}-R${n + 1}`;
}

/** Marks one payment as paid exactly once and runs everything that follows. Returns false when it was already paid. */
export async function settle(paymentId: string, method: string, txn: string): Promise<boolean> {
  const p0 = await prisma.payment.findUnique({ where: { id: paymentId }, include: { application: true } });
  if (!p0 || p0.status === 'paid') return false;
  const a = p0.application;
  let receiptNo = await nextReceipt(a.id, a.refNo);
  // the status condition makes this safe when the webhook and the return page arrive at the same time
  for (let i = 0; i < 3; i++) {
    try {
      const r = await prisma.payment.updateMany({ where: { id: paymentId, status: { not: 'paid' } }, data: { status: 'paid', paidAt: new Date(), method, txn: txn || null, receiptNo } });
      if (!r.count) return false;
      break;
    } catch {
      receiptNo = `${a.refNo}-R${Date.now().toString(36).slice(-4).toUpperCase()}`;
    }
  }
  const p = (await prisma.payment.findUnique({ where: { id: paymentId } }))!;
  await prisma.message.create({ data: { applicationId: a.id, fromAdmin: true, body: `✅ Payment received, thank you! ${p.label}: ${money(charged(p))}. Receipt ${p.receiptNo} is ready to download.` } });

  // paying a sent quotation confirms the order
  const q = quoteOf(a);
  let confirmed = false;
  if (q.sentAt && !q.acceptedAt) {
    q.acceptedAt = new Date().toISOString();
    await prisma.application.update({ where: { id: a.id }, data: { quote: JSON.stringify(q) } });
    confirmed = true;
  }
  const cfg = await getSetting('payments');
  if (cfg.autoStage) {
    const open = await prisma.payment.count({ where: { applicationId: a.id, status: 'due' } });
    const steps = await stepsFor(a.service);
    const cur = steps.findIndex((s) => s.id === currentStageId(a, steps));
    const paidIdx = steps.findIndex((s) => s.id === 'paid');
    if (!open && paidIdx >= 0 && cur < paidIdx) await setStage(a.id, 'paid');
  }
  void afterPaid(a.id, p.id, confirmed).catch((e) => console.error('[pay] after-payment steps failed:', e));
  return true;
}

async function afterPaid(appId: string, pid: string, confirmed: boolean) {
  const a = await prisma.application.findUnique({ where: { id: appId } });
  const p = await prisma.payment.findUnique({ where: { id: pid } });
  if (!a || !p) return;
  const { notifyClient, notifyTeam } = await import('./notify');
  const links = await tokenLinks(a);
  if (confirmed) await notifyClient(a, 'confirmed', { total: money(quoteTotal(quoteOf(a))) });
  await notifyClient(
    a,
    'paid',
    { item: p.label, amount: money(charged(p)), receipt: p.receiptNo || '' },
    { file: { link: links.receiptPdf(p.id), name: `Receipt ${p.receiptNo}.pdf` } }
  );
  await notifyTeam('teamPayment', { name: a.fullName, ref: a.refNo, item: p.label, amount: money(charged(p)) }, a.id);
}

/** Finds a payment from the provider's reference (webhooks) */
export async function findByProvider(provider: PayProvider, id: string) {
  if (!id) return null;
  return prisma.payment.findFirst({ where: { provider, OR: [{ providerId: id }, { providerRef: id }] } });
}

/** Checks open checkouts started in the last 3 days (webhooks of providers that only say "something changed", and a safety net) */
export async function recheckPending(provider?: PayProvider) {
  const since = new Date(Date.now() - 3 * 86_400_000);
  const open = await prisma.payment.findMany({ where: { status: 'due', providerId: { not: null }, startedAt: { gte: since }, ...(provider ? { provider } : {}) }, take: 50 });
  let n = 0;
  for (const p of open) {
    const s = await checkStatus(p);
    if (s.state === 'paid' && (await settle(p.id, methodName(p.provider || ''), s.txn || p.providerId || ''))) n++;
  }
  return n;
}

/* ---------- webhook checks ---------- */
export function stripeVerify(raw: string, header: string, secret: string) {
  const parts = Object.fromEntries(header.split(',').map((x) => x.split('=') as [string, string]));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 600) return false;
  const sig = createHmac('sha256', secret).update(`${parts.t}.${raw}`).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(parts.v1));
  } catch {
    return false;
  }
}
export function totalpayVerify(f: Record<string, string>, pass: string) {
  const h = tpHash((f.id || '') + (f.order_number || '') + (f.order_amount || '') + (f.order_currency || '') + (f.order_description || '') + pass);
  return !!f.hash && h === f.hash;
}

/** Balance of a file: quote total minus everything already requested */
export async function quoteBalance(a: Pick<Application, 'id' | 'quote'>) {
  const total = quoteTotal(quoteOf(a));
  const requested = await prisma.payment.aggregate({ where: { applicationId: a.id }, _sum: { amount: true } });
  return Math.round((total - (requested._sum.amount || 0)) * 100) / 100;
}

/** "Pay & confirm" on a quotation: reuses an open payment or creates one for the remaining balance */
export async function orderPayment(a: Pick<Application, 'id' | 'quote' | 'service'>): Promise<string | null> {
  const open = await prisma.payment.findFirst({ where: { applicationId: a.id, status: 'due' }, orderBy: { createdAt: 'asc' } });
  if (open) return open.id;
  if (!quoteOf(a).sentAt) return null;
  const bal = await quoteBalance(a);
  if (bal <= 0) return null;
  const any = await prisma.payment.count({ where: { applicationId: a.id } });
  const p = await prisma.payment.create({ data: { applicationId: a.id, label: `${a.service} · ${any ? 'balance' : 'full payment'}`, amount: bal } });
  return p.id;
}
