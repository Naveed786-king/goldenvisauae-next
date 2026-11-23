import { ok, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import { waAdvice } from '@/lib/portal/whatsapp';

export const dynamic = 'force-dynamic';
const G = 'https://graph.facebook.com/v21.0';

/** WhatsApp setup checks (Admin > WhatsApp > Setup): check the number, register it with its PIN,
 *  connect incoming messages (subscribe the app to the business account). */
export async function POST(req: Request) {
  if (!(await requireAdmin())) return fail('Admins only', 403);
  const b = await req.json().catch(() => ({}));
  const w = await getSetting('whatsapp');
  if (!w.phoneNumberId || !w.accessToken) return fail('Save the phone number ID and the access token first');
  const call = async (path: string, method: 'GET' | 'POST', body?: unknown) => {
    const r = await fetch(`${G}/${path}`, {
      method,
      headers: { Authorization: `Bearer ${w.accessToken}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const j: any = await r.json().catch(() => ({}));
    return { ok: r.ok, j, error: r.ok ? '' : waAdvice(j?.error?.message || `HTTP ${r.status}`, j?.error?.code) };
  };
  switch (b.action) {
    case 'check': {
      const r = await call(`${encodeURIComponent(w.phoneNumberId)}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,name_status,platform_type`, 'GET');
      if (!r.ok) return ok({ ok: false, msg: r.error });
      const x = r.j;
      return ok({
        ok: true,
        msg: `Connected: ${x.display_phone_number || ''} · ${x.verified_name || ''} · name ${String(x.name_status || 'unknown').toLowerCase().replace(/_/g, ' ')} · quality ${String(x.quality_rating || 'unknown').toLowerCase()}${x.platform_type === 'CLOUD_API' ? ' · registered on the Cloud API' : ' · not registered yet: enter the 6-digit PIN and press Register number'}`,
      });
    }
    case 'register': {
      const pin = String(b.pin || '').replace(/\D/g, '');
      if (pin.length !== 6) return fail('Enter the 6-digit PIN of the number (two-step verification)');
      const r = await call(`${encodeURIComponent(w.phoneNumberId)}/register`, 'POST', { messaging_product: 'whatsapp', pin });
      return ok({ ok: r.ok, msg: r.ok ? 'Number registered on the Cloud API.' : r.error });
    }
    case 'subscribe': {
      if (!w.businessId) return fail('Save the WhatsApp Business account ID first');
      const r = await call(`${encodeURIComponent(w.businessId)}/subscribed_apps`, 'POST');
      return ok({ ok: r.ok, msg: r.ok ? 'Incoming messages connected: client replies now come to this site (also paste the webhook URL and verify word in Meta).' : r.error });
    }
    default:
      return fail('Unknown action');
  }
}
