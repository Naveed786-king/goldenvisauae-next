import { ok, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import { PROVIDERS, payOnline } from '@/lib/portal/payments';

export const dynamic = 'force-dynamic';

/** Checks the saved keys of the card payment provider (Admin > Online payments > Test connection). */
export async function POST() {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const c = await getSetting('payments');
  if (!payOnline(c)) return ok({ ok: false, msg: 'Choose a provider, fill in its keys and save first.' });
  try {
    if (c.provider === 'stripe') {
      const r = await fetch('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${c.stripeSecret}` }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`Stripe did not accept the secret key (answer ${r.status}).`);
    } else if (c.provider === 'ziina') {
      const tok = c.ziinaToken.trim().replace(/^Bearer\s+/i, '');
      const r = await fetch('https://api-v2.ziina.com/api/payment_intent/00000000-0000-0000-0000-000000000000', { headers: { Authorization: `Bearer ${tok}` }, signal: AbortSignal.timeout(15000) });
      if (r.status === 401) throw new Error('Ziina did not accept this token. Copy it again from ziina.com/business/connect (the whole token, no spaces).');
      if (r.status === 403) throw new Error('This Ziina token cannot create payments. Create a token with the “write_payment_intents” permission at ziina.com/business/connect.');
    } else if (c.provider === 'ngenius') {
      const r = await fetch(`${c.test ? 'https://api-gateway.sandbox.ngenius-payments.com' : 'https://api-gateway.ngenius-payments.com'}/identity/auth/access-token`, { method: 'POST', headers: { Authorization: `Basic ${c.ngeniusKey}`, 'Content-Type': 'application/vnd.ni-identity.v1+json' }, signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error(`N-Genius did not accept the API key (answer ${r.status}).`);
    } else {
      return ok({ ok: true, msg: `${PROVIDERS.find((p) => p.id === c.provider)?.name} keys saved. Make a small test payment from a client file to confirm.` });
    }
    return ok({ ok: true, msg: 'Connected. Online payments are live.' });
  } catch (e) {
    return ok({ ok: false, msg: (e as Error).message });
  }
}
