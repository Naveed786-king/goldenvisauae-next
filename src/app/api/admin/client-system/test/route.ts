import { ok, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getSetting } from '@/lib/settings';
import { intlNumber, sendWhatsApp, waAdvice, waReady } from '@/lib/portal/whatsapp';
import { fileLink } from '@/lib/portal/files';

export const dynamic = 'force-dynamic';

/** Sends a WhatsApp test: a normal text inside the 24-hour window, otherwise Meta's "hello_world" template */
export async function POST(req: Request) {
  const s = await requireAdmin();
  if (!s) return fail('Admins only', 403);
  const { to, text: custom, mode } = await req.json().catch(() => ({}));
  const msg = String(custom || '').trim().slice(0, 1000) || 'Test message from your website: WhatsApp is connected ✅';
  const number = intlNumber(String(to || ''));
  if (number.length < 8) return fail('Enter a WhatsApp number with country code');
  const w = await getSetting('whatsapp');
  if (!waReady(w)) return fail('Switch on the Cloud API and save the phone number ID and access token first');
  // approved template: sent like a real client update (works any time once the template is approved)
  if (mode === 'template') {
    // the template's "Open my file" button needs a real file link: the newest file is used for the test
    const last = await prisma.application.findFirst({ orderBy: { createdAt: 'desc' }, select: { id: true, token: true, refNo: true } });
    if (!last) return ok({ result: { ok: false, error: 'Open at least one client file first: the template button needs a file link.' } });
    const link = await fileLink(last);
    return ok({ result: await sendWhatsApp({ to: number, event: 'message', text: msg, vars: { name: 'there', ref: last.refNo, text: msg, link }, force: true }) });
  }
  const open = await prisma.notifyLog.findFirst({ where: { channel: 'whatsapp', direction: 'in', to: { endsWith: number.slice(-9) }, createdAt: { gte: new Date(Date.now() - 23.5 * 3600_000) } } });
  const body = open
    ? { messaging_product: 'whatsapp', to: number, type: 'text', text: { body: msg } }
    : { messaging_product: 'whatsapp', to: number, type: 'template', template: { name: 'hello_world', language: { code: 'en_US' } } };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(w.phoneNumberId)}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${w.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const j: any = await r.json().catch(() => ({}));
    const result = r.ok ? { ok: true, error: '' } : { ok: false, error: waAdvice(j?.error?.message || `HTTP ${r.status}`, j?.error?.code) };
    await prisma.notifyLog.create({ data: { channel: 'whatsapp', to: number, event: 'test', text: open ? 'test text' : '[template hello_world]', ok: result.ok, error: result.error || null } });
    return ok({ result });
  } catch (e) {
    return ok({ result: { ok: false, error: (e as Error).message } });
  }
}
