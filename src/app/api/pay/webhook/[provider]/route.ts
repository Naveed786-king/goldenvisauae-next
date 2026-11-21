import { getSetting } from '@/lib/settings';
import { findByProvider, methodName, recheckPending, settle, stripeVerify, totalpayVerify } from '@/lib/portal/payments';

export const dynamic = 'force-dynamic';

/** Payment provider notifications. Every one is verified (signature, hash, or by asking the provider itself). */
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const cfg = await getSetting('payments');
  const raw = await req.text();
  try {
    if (provider === 'stripe') {
      if (!cfg.stripeWebhook || !stripeVerify(raw, req.headers.get('stripe-signature') || '', cfg.stripeWebhook)) return new Response('Bad signature', { status: 400 });
      const ev = JSON.parse(raw);
      const s = ev?.data?.object;
      if ((ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded') && s?.payment_status === 'paid' && s.metadata?.pid) {
        const p = await findByProvider('stripe', s.id);
        if (p && p.id === s.metadata.pid) await settle(p.id, methodName('stripe'), s.payment_intent || s.id);
      }
      return Response.json({ received: true });
    }
    if (provider === 'totalpay') {
      const f: Record<string, string> = raw.trim().startsWith('{') ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
      if (!totalpayVerify(f, cfg.totalpayPass)) return new Response('Bad hash', { status: 400 });
      if (['success', 'settled'].includes(String(f.status).toLowerCase()) && ['sale', 'purchase', 'capture'].includes(String(f.type || 'sale').toLowerCase())) {
        const p = await findByProvider('totalpay', f.order_number);
        if (p) await settle(p.id, methodName('totalpay'), f.id);
      }
      return new Response('OK');
    }
    if (provider === 'ziina' || provider === 'ngenius' || provider === 'telr') {
      // confirmed by asking the provider directly, never by trusting the notification body
      await recheckPending(provider);
      return new Response('OK');
    }
    return new Response('Unknown provider', { status: 404 });
  } catch (e) {
    console.error('[pay] webhook failed', provider, (e as Error).message);
    return new Response('Error', { status: 500 });
  }
}
